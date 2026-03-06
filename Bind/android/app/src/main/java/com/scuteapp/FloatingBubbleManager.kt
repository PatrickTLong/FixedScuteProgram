package com.scuteapp

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.Choreographer
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.text.TextUtils
import androidx.core.content.res.ResourcesCompat

/**
 * Manages a floating bubble:
 * - Default: Circle with Scute logo
 * - Tap: Expands to pill showing chevron + timer
 * - Tap again: Shows minimalistic blocked app list below the pill
 * - Tap again: Collapses back to circle
 * - Auto-collapses back to circle after a few seconds
 * - Long press: Shows hide button in top-right corner
 */
class FloatingBubbleManager(private val context: Context) {

    companion object {
        private const val TAG = "FloatingBubbleManager"
        private const val ANIMATION_DURATION = 200L
        private const val AUTO_COLLAPSE_DELAY = 3000L  // 3 seconds
        private const val LONG_PRESS_DURATION = 500L   // 0.5 seconds for long press
        private const val HIDE_BUTTON_TIMEOUT = 3000L  // Hide button disappears after 3 seconds
        private const val APP_LIST_COLLAPSE_DELAY = 8000L  // Longer delay when app list is shown
        private const val HAPTIC_HEAVY_MS = 50L  // Duration for impactHeavy haptic

        @Volatile
        private var instance: FloatingBubbleManager? = null

        fun getInstance(context: Context): FloatingBubbleManager {
            return instance ?: synchronized(this) {
                instance ?: FloatingBubbleManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var isShowing = false
    private var isExpanded = false  // false = circle with logo, true = pill with timer
    private var isAppListShown = false  // true = app list panel is visible
    private var isHidden = false    // User manually hid the bubble
    private var endTime: Long = 0
    private var startTime: Long = 0  // For no-time-limit mode (counting up)
    private var isNoTimeLimit = false  // true = count up (elapsed), false = count down (remaining)

    // Survives dismiss+recreate so the bubble reappears where the user dragged it
    // (reset to null only when a genuinely new session starts)
    private var savedX: Int? = null
    private var savedY: Int? = null

    private var bubbleCollapsed: FrameLayout? = null
    private var bubbleExpanded: LinearLayout? = null
    private var bubbleHideButton: FrameLayout? = null
    private var bubbleMain: FrameLayout? = null
    private var bubbleChevron: ImageView? = null
    private var bubbleAppList: LinearLayout? = null
    private var bubbleAppListContainer: LinearLayout? = null
    private var bubbleAppListScroll: ScrollView? = null
    private var bubbleContentWrapper: LinearLayout? = null
    private var isAppListPopulated = false
    private var density: Float = 1f

    private val handler = Handler(Looper.getMainLooper())

    // Drag detection
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false
    private val DRAG_THRESHOLD = 10f  // Pixels moved before considered a drag

    // Frame-synced drag updates to prevent jitter
    private var pendingDragX = 0
    private var pendingDragY = 0
    private var hasPendingDragUpdate = false
    private var dragSizeLocked = false  // True when we've locked window size during drag
    private val dragFrameCallback = Choreographer.FrameCallback {
        if (hasPendingDragUpdate) {
            hasPendingDragUpdate = false
            layoutParams?.x = pendingDragX
            layoutParams?.y = pendingDragY
            try {
                windowManager?.updateViewLayout(bubbleView, layoutParams)
            } catch (e: Exception) {
                Log.e(TAG, "Error updating bubble position", e)
            }
        }
    }

    // Long press detection
    private var longPressTriggered = false
    private val longPressRunnable = Runnable {
        longPressTriggered = true
        triggerHeavyHaptic()
        showHideButton()
    }

    // Auto-hide the hide button
    private val hideButtonTimeoutRunnable = Runnable {
        hideHideButton()
    }

    // Auto-collapse runnable (only collapses if app list isn't open)
    private val autoCollapseRunnable = Runnable {
        if (isExpanded && !isAppListShown) {
            collapse()
        }
    }

    private val timerRunnable = object : Runnable {
        override fun run() {
            if (isNoTimeLimit) {
                // Count up mode (elapsed time)
                val elapsed = (System.currentTimeMillis() - startTime) / 1000
                updateTimerText(elapsed)
                handler.postDelayed(this, 1000)
            } else {
                // Count down mode (remaining time)
                val remaining = (endTime - System.currentTimeMillis()) / 1000
                if (remaining > 0) {
                    updateTimerText(remaining)
                    handler.postDelayed(this, 1000)
                } else {
                    dismiss()
                }
            }
        }
    }

    /**
     * Check if we have permission to draw overlays
     */
    fun canDrawOverlay(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    /**
     * Trigger a heavy haptic (vibration) feedback.
     */
    private fun triggerHeavyHaptic() {
        try {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (vibrator?.hasVibrator() == true) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(HAPTIC_HEAVY_MS, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(HAPTIC_HEAVY_MS)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Haptic feedback failed", e)
        }
    }

    /**
     * Show the floating bubble with countdown timer.
     * @param sessionEndTime The timestamp (in milliseconds) when the session ends
     * @return true if bubble was shown, false if failed
     */
    fun show(sessionEndTime: Long): Boolean {
        // If this is a NEW session (different end time), reset position and hidden state
        if (sessionEndTime != endTime) {
            isHidden = false
            savedX = null
            savedY = null
        }

        // If user manually hid the bubble for THIS session, don't show again
        if (isHidden) {
            Log.d(TAG, "Bubble is hidden by user for this session, not showing")
            return true
        }

        if (isShowing) {
            Log.d(TAG, "Bubble already showing, updating to countdown mode (endTime=$sessionEndTime)")
            endTime = sessionEndTime
            isNoTimeLimit = false
            startTime = 0
            return true
        }

        if (!canDrawOverlay()) {
            Log.w(TAG, "Cannot draw overlay - permission not granted")
            return false
        }

        try {
            endTime = sessionEndTime
            startTime = 0
            isNoTimeLimit = false
            isExpanded = false

            windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            density = context.resources.displayMetrics.density

            // Inflate the bubble layout
            val inflater = LayoutInflater.from(context)
            bubbleView = inflater.inflate(R.layout.floating_bubble, null)

            bubbleCollapsed = bubbleView?.findViewById(R.id.bubble_collapsed)
            bubbleExpanded = bubbleView?.findViewById(R.id.bubble_expanded)
            bubbleHideButton = bubbleView?.findViewById(R.id.bubble_hide_button)
            bubbleMain = bubbleView?.findViewById(R.id.bubble_main)
            bubbleChevron = bubbleView?.findViewById(R.id.bubble_chevron)
            bubbleAppList = bubbleView?.findViewById(R.id.bubble_app_list)
            bubbleAppListContainer = bubbleView?.findViewById(R.id.bubble_app_list_container)
            bubbleAppListScroll = bubbleView?.findViewById(R.id.bubble_app_list_scroll)
            bubbleContentWrapper = bubbleView?.findViewById(R.id.bubble_content_wrapper)

            // Set up window parameters — restore dragged position if available
            val posX = savedX ?: 0
            val posY = savedY ?: (200 * density).toInt()
            layoutParams = WindowManager.LayoutParams().apply {
                width = WindowManager.LayoutParams.WRAP_CONTENT
                height = WindowManager.LayoutParams.WRAP_CONTENT

                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
                }

                flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED

                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.START
                x = posX
                y = posY
            }

            // Set up touch listener for tap and long press
            setupTouchListener()

            // Set up hide button click
            bubbleHideButton?.setOnClickListener {
                triggerHeavyHaptic()
                hideBubble()
            }

            // Initial timer update
            val remaining = (endTime - System.currentTimeMillis()) / 1000
            if (remaining <= 0) {
                Log.d(TAG, "Session already ended, not showing bubble")
                return false
            }
            updateTimerText(remaining)

            // Start in collapsed state (circle with logo)
            bubbleCollapsed?.visibility = View.VISIBLE
            bubbleExpanded?.visibility = View.GONE
            bubbleHideButton?.visibility = View.GONE
            bubbleAppList?.visibility = View.GONE

            // Add to window manager
            windowManager?.addView(bubbleView, layoutParams)
            isShowing = true

            // Animate in with scale effect
            bubbleMain?.scaleX = 0f
            bubbleMain?.scaleY = 0f
            bubbleMain?.alpha = 0f
            bubbleMain?.animate()
                ?.scaleX(1f)
                ?.scaleY(1f)
                ?.alpha(1f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(OvershootInterpolator(1.0f))
                ?.start()

            // Start timer updates
            handler.post(timerRunnable)

            Log.d(TAG, "Bubble shown, session ends at: $sessionEndTime")
            return true

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show bubble", e)
            return false
        }
    }

    /**
     * Show the floating bubble for no-time-limit presets (counts up from start).
     * @param sessionStartTime The timestamp (in milliseconds) when the session started
     * @return true if bubble was shown, false if failed
     */
    fun showNoTimeLimit(sessionStartTime: Long): Boolean {
        // If this is a NEW session (different start time), reset position and hidden state
        if (sessionStartTime != startTime) {
            isHidden = false
            savedX = null
            savedY = null
        }

        // If user manually hid the bubble for THIS session, don't show again
        if (isHidden) {
            Log.d(TAG, "Bubble is hidden by user for this session, not showing")
            return true
        }

        if (isShowing) {
            Log.d(TAG, "Bubble already showing, updating to count-up mode (startTime=$sessionStartTime)")
            startTime = sessionStartTime
            isNoTimeLimit = true
            endTime = 0
            return true
        }

        if (!canDrawOverlay()) {
            Log.w(TAG, "Cannot draw overlay - permission not granted")
            return false
        }

        try {
            startTime = sessionStartTime
            endTime = 0
            isNoTimeLimit = true
            isExpanded = false

            windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            density = context.resources.displayMetrics.density

            // Inflate the bubble layout
            val inflater = LayoutInflater.from(context)
            bubbleView = inflater.inflate(R.layout.floating_bubble, null)

            bubbleCollapsed = bubbleView?.findViewById(R.id.bubble_collapsed)
            bubbleExpanded = bubbleView?.findViewById(R.id.bubble_expanded)
            bubbleHideButton = bubbleView?.findViewById(R.id.bubble_hide_button)
            bubbleMain = bubbleView?.findViewById(R.id.bubble_main)
            bubbleChevron = bubbleView?.findViewById(R.id.bubble_chevron)
            bubbleAppList = bubbleView?.findViewById(R.id.bubble_app_list)
            bubbleAppListContainer = bubbleView?.findViewById(R.id.bubble_app_list_container)
            bubbleAppListScroll = bubbleView?.findViewById(R.id.bubble_app_list_scroll)
            bubbleContentWrapper = bubbleView?.findViewById(R.id.bubble_content_wrapper)

            // Set up window parameters — restore dragged position if available
            val posX = savedX ?: 0
            val posY = savedY ?: (200 * density).toInt()
            layoutParams = WindowManager.LayoutParams().apply {
                width = WindowManager.LayoutParams.WRAP_CONTENT
                height = WindowManager.LayoutParams.WRAP_CONTENT

                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
                }

                flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED

                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.START
                x = posX
                y = posY
            }

            // Set up touch listener for tap and long press
            setupTouchListener()

            // Set up hide button click
            bubbleHideButton?.setOnClickListener {
                triggerHeavyHaptic()
                hideBubble()
            }

            // Initial elapsed time update
            val elapsed = (System.currentTimeMillis() - startTime) / 1000
            updateTimerText(elapsed)

            // Start in collapsed state (circle with logo)
            bubbleCollapsed?.visibility = View.VISIBLE
            bubbleExpanded?.visibility = View.GONE
            bubbleHideButton?.visibility = View.GONE
            bubbleAppList?.visibility = View.GONE

            // Add to window manager
            windowManager?.addView(bubbleView, layoutParams)
            isShowing = true

            // Animate in with scale effect
            bubbleMain?.scaleX = 0f
            bubbleMain?.scaleY = 0f
            bubbleMain?.alpha = 0f
            bubbleMain?.animate()
                ?.scaleX(1f)
                ?.scaleY(1f)
                ?.alpha(1f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(OvershootInterpolator(1.0f))
                ?.start()

            // Start timer updates (will count up since isNoTimeLimit is true)
            handler.post(timerRunnable)

            Log.d(TAG, "Bubble shown for no-time-limit, session started at: $sessionStartTime")
            return true

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show bubble for no-time-limit", e)
            return false
        }
    }


    /**
     * Set up touch listener for tap, long press, and drag detection
     */
    private fun setupTouchListener() {
        bubbleMain?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    // Store initial positions for drag
                    initialX = layoutParams?.x ?: 0
                    initialY = layoutParams?.y ?: 0
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    longPressTriggered = false
                    // Pause auto-collapse while touching the bubble
                    handler.removeCallbacks(autoCollapseRunnable)
                    handler.postDelayed(longPressRunnable, LONG_PRESS_DURATION)
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = event.rawX - initialTouchX
                    val deltaY = event.rawY - initialTouchY

                    // Check if we've moved enough to start dragging
                    if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
                        isDragging = true
                        // Cancel long press if we start dragging
                        handler.removeCallbacks(longPressRunnable)
                        // Lock window to measured pixel size during drag to prevent
                        // expensive WRAP_CONTENT re-measurement on every frame
                        lockWindowSizeForDrag()
                    }

                    if (isDragging && !longPressTriggered) {
                        // Batch position update to next vsync frame to prevent jitter
                        pendingDragX = (initialX + deltaX).toInt()
                        pendingDragY = (initialY + deltaY).toInt()
                        if (!hasPendingDragUpdate) {
                            hasPendingDragUpdate = true
                            Choreographer.getInstance().postFrameCallback(dragFrameCallback)
                        }
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    handler.removeCallbacks(longPressRunnable)
                    Choreographer.getInstance().removeFrameCallback(dragFrameCallback)
                    hasPendingDragUpdate = false
                    unlockWindowSize()
                    // Save position after drag so it survives dismiss+recreate
                    if (isDragging) {
                        savedX = layoutParams?.x
                        savedY = layoutParams?.y
                    }
                    if (!isDragging && !longPressTriggered) {
                        triggerHeavyHaptic()
                        if (isExpanded) {
                            // Any tap while expanded toggles the app list
                            toggleAppList()
                        } else {
                            toggleExpanded()
                        }
                    } else if (isExpanded) {
                        // Reschedule auto-collapse after drag/long-press ends
                        handler.postDelayed(autoCollapseRunnable, AUTO_COLLAPSE_DELAY)
                    }
                    isDragging = false
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    handler.removeCallbacks(longPressRunnable)
                    Choreographer.getInstance().removeFrameCallback(dragFrameCallback)
                    hasPendingDragUpdate = false
                    unlockWindowSize()
                    isDragging = false
                    // Reschedule auto-collapse if still expanded
                    if (isExpanded) {
                        handler.postDelayed(autoCollapseRunnable, AUTO_COLLAPSE_DELAY)
                    }
                    true
                }
                else -> false
            }
        }
    }

    /**
     * Lock the window to its current measured pixel size so that
     * updateViewLayout() during drag skips the expensive WRAP_CONTENT measure pass.
     */
    private fun lockWindowSizeForDrag() {
        val view = bubbleView ?: return
        val params = layoutParams ?: return
        if (dragSizeLocked) return

        val measuredW = view.measuredWidth
        val measuredH = view.measuredHeight
        if (measuredW > 0 && measuredH > 0) {
            params.width = measuredW
            params.height = measuredH
            dragSizeLocked = true
        }
    }

    /**
     * Restore WRAP_CONTENT after drag ends so the bubble can resize normally
     * (e.g. when the timer text gains a digit, or app list opens/closes).
     */
    private fun unlockWindowSize() {
        if (!dragSizeLocked) return
        dragSizeLocked = false
        val params = layoutParams ?: return
        params.width = WindowManager.LayoutParams.WRAP_CONTENT
        params.height = WindowManager.LayoutParams.WRAP_CONTENT
        try {
            windowManager?.updateViewLayout(bubbleView, params)
        } catch (e: Exception) {
            Log.e(TAG, "Error restoring wrap_content after drag", e)
        }
    }

    /**
     * Check if a touch event landed on the chevron area (with generous padding)
     */
    private fun isTapOnChevron(event: MotionEvent): Boolean {
        val chevron = bubbleChevron ?: return false
        val loc = IntArray(2)
        chevron.getLocationOnScreen(loc)
        // Add generous touch padding around the chevron
        val padding = (12 * density).toInt()
        val left = loc[0] - padding
        val top = loc[1] - padding
        val right = loc[0] + chevron.width + padding
        val bottom = loc[1] + chevron.height + padding
        return event.rawX >= left && event.rawX <= right &&
               event.rawY >= top && event.rawY <= bottom
    }

    /**
     * Show the hide button centered above the pill
     */
    private fun showHideButton() {
        bubbleHideButton?.let { button ->
            button.post {
                button.visibility = View.VISIBLE
                button.scaleX = 0f
                button.scaleY = 0f
                button.alpha = 0f

                button.animate()
                    ?.scaleX(1f)
                    ?.scaleY(1f)
                    ?.alpha(1f)
                    ?.setDuration(150)
                    ?.setInterpolator(OvershootInterpolator(1.2f))
                    ?.start()
            }

            // Auto-hide the button after timeout
            handler.removeCallbacks(hideButtonTimeoutRunnable)
            handler.postDelayed(hideButtonTimeoutRunnable, HIDE_BUTTON_TIMEOUT)
        }

        Log.d(TAG, "Hide button shown")
    }

    /**
     * Hide the hide button with smooth fade out
     */
    private fun hideHideButton() {
        bubbleHideButton?.let { button ->
            button.post {
                button.animate()
                    ?.alpha(0f)
                    ?.setDuration(250)
                    ?.setInterpolator(DecelerateInterpolator())
                    ?.withEndAction {
                        button.visibility = View.GONE
                        button.alpha = 1f
                    }
                    ?.start()
            }
        }

        Log.d(TAG, "Hide button hidden")
    }

    /**
     * Hide the bubble (user tapped X button)
     */
    private fun hideBubble() {
        isHidden = true

        handler.removeCallbacks(hideButtonTimeoutRunnable)
        handler.removeCallbacks(autoCollapseRunnable)

        // Fade out both the bubble and the hide button together
        bubbleView?.post {
            // Fade out the main bubble
            bubbleMain?.animate()
                ?.alpha(0f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(DecelerateInterpolator())
                ?.withEndAction {
                    try {
                        windowManager?.removeView(bubbleView)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error removing bubble view", e)
                    }

                    bubbleView = null
                    bubbleCollapsed = null
                    bubbleExpanded = null
                    bubbleHideButton = null
                    bubbleMain = null
                    windowManager = null
                    layoutParams = null
                    isShowing = false
                    isExpanded = false
                    // Note: isHidden stays true until dismiss() is called (session end)

                    Log.d(TAG, "Bubble hidden by user")
                }
                ?.start()

            // Fade out the hide button at the same time
            bubbleHideButton?.animate()
                ?.alpha(0f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(DecelerateInterpolator())
                ?.start()
        }
    }

    /**
     * Toggle between collapsed and expanded states.
     * App list is only toggled via the chevron tap.
     */
    private fun toggleExpanded() {
        // Hide the hide button if visible
        if (bubbleHideButton?.visibility == View.VISIBLE) {
            hideHideButton()
        }

        if (!isExpanded) {
            // Collapsed -> Expanded (pill with chevron + timer)
            expand()
        } else {
            // Expanded (with or without app list) -> Collapse back to circle
            collapse()
        }
    }

    /**
     * Toggle the app list via chevron tap
     */
    private fun toggleAppList() {
        if (!isAppListShown) {
            showAppList()
        } else {
            hideAppList(animate = true)
            // Reschedule auto-collapse from the pill state
            handler.removeCallbacks(autoCollapseRunnable)
            handler.postDelayed(autoCollapseRunnable, AUTO_COLLAPSE_DELAY)
        }
    }

    /**
     * Expand to pill showing timer with smooth animation
     */
    private fun expand() {
        if (isExpanded) return
        isExpanded = true

        // Cancel any pending auto-collapse
        handler.removeCallbacks(autoCollapseRunnable)

        // Smooth crossfade animation
        bubbleCollapsed?.post {
            bubbleCollapsed?.animate()
                ?.alpha(0f)
                ?.scaleX(0.9f)
                ?.scaleY(0.9f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(AccelerateDecelerateInterpolator())
                ?.withEndAction {
                    bubbleCollapsed?.visibility = View.GONE
                    bubbleCollapsed?.alpha = 1f
                    bubbleCollapsed?.scaleX = 1f
                    bubbleCollapsed?.scaleY = 1f

                    // Show expanded
                    bubbleExpanded?.visibility = View.VISIBLE
                    bubbleExpanded?.alpha = 0f
                    bubbleExpanded?.scaleX = 0.9f
                    bubbleExpanded?.scaleY = 0.9f

                    bubbleExpanded?.animate()
                        ?.alpha(1f)
                        ?.scaleX(1f)
                        ?.scaleY(1f)
                        ?.setDuration(ANIMATION_DURATION)
                        ?.setInterpolator(AccelerateDecelerateInterpolator())
                        ?.start()
                }
                ?.start()
        }

        // Schedule auto-collapse
        handler.postDelayed(autoCollapseRunnable, AUTO_COLLAPSE_DELAY)

        Log.d(TAG, "Bubble expanded")
    }

    /**
     * Collapse back to circle with logo with smooth animation
     */
    private fun collapse() {
        if (!isExpanded) return
        isExpanded = false

        // Cancel any pending auto-collapse
        handler.removeCallbacks(autoCollapseRunnable)

        // Hide app list if visible
        if (isAppListShown) {
            hideAppList(animate = false)
        }

        // Hide the X button if it's visible
        if (bubbleHideButton?.visibility == View.VISIBLE) {
            hideHideButton()
        }

        // Smooth crossfade animation
        bubbleExpanded?.post {
            bubbleExpanded?.animate()
                ?.alpha(0f)
                ?.scaleX(0.9f)
                ?.scaleY(0.9f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(AccelerateDecelerateInterpolator())
                ?.withEndAction {
                    bubbleExpanded?.visibility = View.GONE
                    bubbleExpanded?.alpha = 1f
                    bubbleExpanded?.scaleX = 1f
                    bubbleExpanded?.scaleY = 1f

                    // Show collapsed
                    bubbleCollapsed?.visibility = View.VISIBLE
                    bubbleCollapsed?.alpha = 0f
                    bubbleCollapsed?.scaleX = 0.9f
                    bubbleCollapsed?.scaleY = 0.9f

                    bubbleCollapsed?.animate()
                        ?.alpha(1f)
                        ?.scaleX(1f)
                        ?.scaleY(1f)
                        ?.setDuration(ANIMATION_DURATION)
                        ?.setInterpolator(AccelerateDecelerateInterpolator())
                        ?.start()
                }
                ?.start()
        }

        Log.d(TAG, "Bubble collapsed")
    }

    /**
     * Populate the app list panel with blocked apps from SharedPreferences
     */
    private fun populateAppList() {
        val container = bubbleAppListContainer ?: return
        container.removeAllViews()

        val prefs = context.getSharedPreferences(
            UninstallBlockerService.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet()) ?: emptySet()
        val blockedWebsites = prefs.getStringSet("blocked_websites", emptySet()) ?: emptySet()
        val pm = context.packageManager

        // Add all blocked apps (ScrollView handles overflow)
        for (packageName in blockedApps.sorted()) {
            try {
                val appInfo = pm.getApplicationInfo(packageName, 0)
                val appName = pm.getApplicationLabel(appInfo).toString()
                val appIcon = pm.getApplicationIcon(appInfo)

                val entryView = LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(
                        (12 * density).toInt(),
                        (5 * density).toInt(),
                        (8 * density).toInt(),
                        (5 * density).toInt()
                    )
                }

                val iconView = ImageView(context).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        (22 * density).toInt(),
                        (22 * density).toInt()
                    ).apply {
                        marginEnd = (10 * density).toInt()
                    }
                    setImageDrawable(appIcon)
                    scaleType = ImageView.ScaleType.FIT_CENTER
                }

                val nameView = TextView(context).apply {
                    text = appName
                    setTextColor(0xFFFFFFFF.toInt())
                    textSize = 12f
                    typeface = ResourcesCompat.getFont(context, R.font.plusjakartasans_bold)
                    letterSpacing = 0.03f
                    maxLines = 1
                    ellipsize = TextUtils.TruncateAt.END
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    )
                }

                entryView.addView(iconView)
                entryView.addView(nameView)
                container.addView(entryView)
            } catch (e: Exception) {
                // Package not found, skip
            }
        }

        // Add all blocked websites
        for (website in blockedWebsites.sorted()) {
            val entryView = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(
                    (12 * density).toInt(),
                    (5 * density).toInt(),
                    (8 * density).toInt(),
                    (5 * density).toInt()
                )
            }

            val iconView = ImageView(context).apply {
                layoutParams = LinearLayout.LayoutParams(
                    (22 * density).toInt(),
                    (22 * density).toInt()
                ).apply {
                    marginEnd = (10 * density).toInt()
                }
                setImageDrawable(context.getDrawable(R.drawable.ic_globe))
                scaleType = ImageView.ScaleType.FIT_CENTER
            }

            val nameView = TextView(context).apply {
                text = website
                setTextColor(0xFFFFFFFF.toInt())
                textSize = 12f
                typeface = ResourcesCompat.getFont(context, R.font.plusjakartasans_bold)
                letterSpacing = 0.03f
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }

            entryView.addView(iconView)
            entryView.addView(nameView)
            container.addView(entryView)
        }

        // If more than 8 items, cap the ScrollView so it becomes scrollable
        val totalItems = container.childCount
        if (totalItems > 8) {
            val itemHeight = (32 * density).toInt()   // 22dp icon + 10dp padding
            val containerPadding = (16 * density).toInt()  // 8dp top + 8dp bottom
            bubbleAppListScroll?.layoutParams = bubbleAppListScroll?.layoutParams?.apply {
                height = (itemHeight * 8) + containerPadding
            }
        }
    }

    /**
     * Collapse the top layout margins (hide-button area) to shrink the overlay
     * window rect, so outside touches pass through to the screen below.
     * Shifts the window Y downward by the same amount to keep the pill visually stable.
     */
    private fun collapseTopMargins() {
        val topMargin = (29 * density).toInt()  // 16dp wrapper + 13dp bubble_main

        // Shrink content wrapper top margin (16dp → 0dp)
        (bubbleContentWrapper?.layoutParams as? FrameLayout.LayoutParams)?.let {
            it.topMargin = 0
            bubbleContentWrapper?.layoutParams = it
        }
        // Shrink bubble_main top margin (13dp → 0dp)
        (bubbleMain?.layoutParams as? LinearLayout.LayoutParams)?.let {
            it.topMargin = 0
            bubbleMain?.layoutParams = it
        }
        // Shrink app list top margin (6dp → 2dp)
        (bubbleAppList?.layoutParams as? LinearLayout.LayoutParams)?.let {
            it.topMargin = (2 * density).toInt()
            bubbleAppList?.layoutParams = it
        }

        // Shift window down so the pill stays in the same visual position
        layoutParams?.let { params ->
            params.y = params.y + topMargin
            try {
                windowManager?.updateViewLayout(bubbleView, params)
            } catch (e: Exception) {
                Log.e(TAG, "Error collapsing top margins", e)
            }
        }
    }

    /**
     * Restore the top layout margins to their original values and shift
     * the window Y back up so the pill stays visually stable.
     */
    private fun restoreTopMargins() {
        val topMargin = (29 * density).toInt()

        (bubbleContentWrapper?.layoutParams as? FrameLayout.LayoutParams)?.let {
            it.topMargin = (16 * density).toInt()
            bubbleContentWrapper?.layoutParams = it
        }
        (bubbleMain?.layoutParams as? LinearLayout.LayoutParams)?.let {
            it.topMargin = (13 * density).toInt()
            bubbleMain?.layoutParams = it
        }
        (bubbleAppList?.layoutParams as? LinearLayout.LayoutParams)?.let {
            it.topMargin = (6 * density).toInt()
            bubbleAppList?.layoutParams = it
        }

        layoutParams?.let { params ->
            params.y = params.y - topMargin
            try {
                windowManager?.updateViewLayout(bubbleView, params)
            } catch (e: Exception) {
                Log.e(TAG, "Error restoring top margins", e)
            }
        }
    }

    /**
     * Show the app list panel below the expanded pill
     */
    private fun showAppList() {
        isAppListShown = true

        // Lazy-populate the app list on first open
        if (!isAppListPopulated) {
            populateAppList()
            isAppListPopulated = true
        }

        // Extend auto-collapse delay while viewing app list
        handler.removeCallbacks(autoCollapseRunnable)

        // Rotate caret from right (0) to down (90)
        bubbleChevron?.animate()
            ?.rotation(90f)
            ?.setDuration(ANIMATION_DURATION)
            ?.setInterpolator(DecelerateInterpolator())
            ?.start()

        // Slide in the app list panel
        bubbleAppList?.let { list ->
            list.visibility = View.VISIBLE
            list.alpha = 0f
            list.translationY = -10 * density
            list.animate()
                ?.alpha(1f)
                ?.translationY(0f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(DecelerateInterpolator())
                ?.start()
        }

        Log.d(TAG, "App list shown")
    }

    /**
     * Hide the app list panel
     */
    private fun hideAppList(animate: Boolean = true) {
        isAppListShown = false

        if (animate) {
            // Rotate caret back to right
            bubbleChevron?.animate()
                ?.rotation(0f)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(DecelerateInterpolator())
                ?.start()

            bubbleAppList?.animate()
                ?.alpha(0f)
                ?.translationY(-10 * density)
                ?.setDuration(ANIMATION_DURATION)
                ?.setInterpolator(AccelerateDecelerateInterpolator())
                ?.withEndAction {
                    bubbleAppList?.visibility = View.GONE
                    bubbleAppList?.translationY = 0f
                }
                ?.start()
        } else {
            bubbleChevron?.rotation = 0f
            bubbleAppList?.visibility = View.GONE
            bubbleAppList?.alpha = 1f
            bubbleAppList?.translationY = 0f
        }

        Log.d(TAG, "App list hidden")
    }

    /**
     * Update the timer text display
     */
    private fun updateTimerText(secondsRemaining: Long) {
        val timerText = bubbleView?.findViewById<TextView>(R.id.bubble_timer)
        timerText?.post {
            timerText.text = formatTime(secondsRemaining)
        }
    }

    /**
     * Format seconds into readable time string
     */
    private fun formatTime(seconds: Long): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return if (hours > 0) {
            String.format("%d:%02d:%02d", hours, minutes, secs)
        } else {
            String.format("%d:%02d", minutes, secs)
        }
    }

    /**
     * Dismiss the bubble completely (session ended)
     */
    fun dismiss() {
        if (!isShowing && !isHidden) return

        try {
            handler.removeCallbacks(timerRunnable)
            handler.removeCallbacks(autoCollapseRunnable)
            handler.removeCallbacks(longPressRunnable)
            handler.removeCallbacks(hideButtonTimeoutRunnable)

            if (isShowing) {
                // Animate out with scale
                bubbleMain?.post {
                    bubbleMain?.animate()
                        ?.scaleX(0f)
                        ?.scaleY(0f)
                        ?.alpha(0f)
                        ?.setDuration(ANIMATION_DURATION)
                        ?.setInterpolator(DecelerateInterpolator())
                        ?.withEndAction {
                            cleanupViews()
                        }
                        ?.start()
                }
            } else {
                cleanupViews()
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing bubble", e)
            cleanupViews()
        }
    }

    private fun cleanupViews() {
        try {
            windowManager?.removeView(bubbleView)
        } catch (e: Exception) {
            Log.e(TAG, "Error removing bubble view", e)
        }

        bubbleView = null
        bubbleCollapsed = null
        bubbleExpanded = null
        bubbleHideButton = null
        bubbleMain = null
        bubbleChevron = null
        bubbleAppList = null
        bubbleAppListContainer = null
        bubbleAppListScroll = null
        bubbleContentWrapper = null
        windowManager = null
        layoutParams = null
        isShowing = false
        isExpanded = false
        isAppListShown = false
        isAppListPopulated = false  // Reset so next session re-fetches
        isHidden = false  // Reset for next session
        isNoTimeLimit = false  // Reset mode for next session
        startTime = 0
        endTime = 0

        Log.d(TAG, "Bubble dismissed")
    }

    /**
     * Dismiss the bubble immediately without animation.
     * Used when transitioning between sessions (e.g. no-time-limit → scheduled)
     * to avoid race conditions with the async dismiss animation.
     */
    fun dismissImmediate() {
        handler.removeCallbacks(timerRunnable)
        handler.removeCallbacks(autoCollapseRunnable)
        handler.removeCallbacks(longPressRunnable)
        handler.removeCallbacks(hideButtonTimeoutRunnable)
        cleanupViews()
        Log.d(TAG, "Bubble dismissed immediately (no animation)")
    }

    /**
     * Check if bubble is currently showing
     */
    fun isShowing(): Boolean = isShowing

    /**
     * Reset the isHidden flag so the bubble can be re-shown.
     * Called when user enters the Scute app - if they X'd the bubble,
     * it will reappear next time show() is called.
     */
    fun resetHidden() {
        isHidden = false
        Log.d(TAG, "isHidden reset")
    }


}
