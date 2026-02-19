package com.scuteapp

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
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

    private var bubbleCollapsed: FrameLayout? = null
    private var bubbleExpanded: LinearLayout? = null
    private var bubbleHideButton: FrameLayout? = null
    private var bubbleMain: FrameLayout? = null
    private var bubbleChevron: ImageView? = null
    private var bubbleAppList: LinearLayout? = null
    private var bubbleAppListContainer: LinearLayout? = null
    private var bubbleAppListScroll: ScrollView? = null
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
        showHideButton()
    }

    // Auto-hide the hide button
    private val hideButtonTimeoutRunnable = Runnable {
        hideHideButton()
    }

    // Auto-collapse runnable
    private val autoCollapseRunnable = Runnable {
        if (isExpanded) {
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
     * Show the floating bubble with countdown timer.
     * @param sessionEndTime The timestamp (in milliseconds) when the session ends
     * @return true if bubble was shown, false if failed
     */
    fun show(sessionEndTime: Long): Boolean {
        // If this is a NEW session (different end time), reset isHidden
        if (sessionEndTime != endTime) {
            isHidden = false
        }

        // If user manually hid the bubble for THIS session, don't show again
        if (isHidden) {
            Log.d(TAG, "Bubble is hidden by user for this session, not showing")
            return true
        }

        if (isShowing) {
            Log.d(TAG, "Bubble already showing, updating end time")
            endTime = sessionEndTime
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

            // Populate the app list from blocked apps
            populateAppList()

            // Set up window parameters - LEFT side, fixed position
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
                x = 0
                y = (200 * density).toInt()  // Position from top
            }

            // Set up touch listener for tap and long press
            setupTouchListener()

            // Set up hide button click
            bubbleHideButton?.setOnClickListener {
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
        // If this is a NEW session (different start time), reset isHidden
        if (sessionStartTime != startTime) {
            isHidden = false
        }

        // If user manually hid the bubble for THIS session, don't show again
        if (isHidden) {
            Log.d(TAG, "Bubble is hidden by user for this session, not showing")
            return true
        }

        if (isShowing) {
            Log.d(TAG, "Bubble already showing, updating start time")
            startTime = sessionStartTime
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

            // Populate the app list from blocked apps
            populateAppList()

            // Set up window parameters - LEFT side, fixed position
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
                x = 0
                y = (200 * density).toInt()  // Position from top
            }

            // Set up touch listener for tap and long press
            setupTouchListener()

            // Set up hide button click
            bubbleHideButton?.setOnClickListener {
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
                    if (!isDragging && !longPressTriggered) {
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
                        (12 * density).toInt(),
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
                    typeface = ResourcesCompat.getFont(context, R.font.nunito_bold)
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
                    (12 * density).toInt(),
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
                typeface = ResourcesCompat.getFont(context, R.font.nunito_bold)
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

        // Constrain ScrollView height programmatically after layout pass
        bubbleAppListScroll?.post {
            val maxH = (200 * density).toInt()
            bubbleAppListScroll?.let { scroll ->
                val contentHeight = scroll.getChildAt(0)?.height ?: 0
                if (contentHeight > maxH) {
                    scroll.layoutParams = scroll.layoutParams.apply {
                        height = maxH
                    }
                    scroll.requestLayout()
                }
            }
        }
    }

    /**
     * Show the app list panel below the expanded pill
     */
    private fun showAppList() {
        isAppListShown = true

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

        // Allow touches outside the bubble to pass through to the screen below
        // while still letting the ScrollView scroll within the overlay
        layoutParams?.let { params ->
            params.flags = params.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            try {
                windowManager?.updateViewLayout(bubbleView, params)
            } catch (e: Exception) {
                Log.e(TAG, "Error updating layout for app list", e)
            }
        }

        // Schedule auto-collapse with longer delay
        handler.postDelayed(autoCollapseRunnable, APP_LIST_COLLAPSE_DELAY)

        Log.d(TAG, "App list shown")
    }

    /**
     * Hide the app list panel
     */
    private fun hideAppList(animate: Boolean = true) {
        isAppListShown = false

        // Remove FLAG_NOT_TOUCH_MODAL since the app list is no longer shown
        layoutParams?.let { params ->
            params.flags = params.flags and WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL.inv()
            try {
                windowManager?.updateViewLayout(bubbleView, params)
            } catch (e: Exception) {
                Log.e(TAG, "Error restoring layout flags", e)
            }
        }

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
        windowManager = null
        layoutParams = null
        isShowing = false
        isExpanded = false
        isAppListShown = false
        isHidden = false  // Reset for next session
        isNoTimeLimit = false  // Reset mode for next session
        startTime = 0
        endTime = 0

        Log.d(TAG, "Bubble dismissed")
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
