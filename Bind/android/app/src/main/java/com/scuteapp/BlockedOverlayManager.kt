package com.scuteapp

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView

/**
 * Manages a WindowManager-based overlay that appears INSTANTLY when a blocked app is detected.
 * This is much faster than launching an Activity because:
 * 1. No Activity lifecycle overhead
 * 2. No intent dispatch delay
 * 3. Direct window manipulation
 *
 * The overlay appears on top of everything and blocks all touch input to the app behind it.
 */
class BlockedOverlayManager(private val context: Context) {

    companion object {
        private const val TAG = "BlockedOverlayManager"
        const val TYPE_APP = "app"
        const val TYPE_WEBSITE = "website"
        const val TYPE_SETTINGS = "settings"
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var isShowing = false

    // Callback when overlay is dismissed
    var onDismissed: (() -> Unit)? = null

    // Store current block info for "Continue anyway"
    private var currentBlockedType: String = TYPE_APP
    private var currentBlockedItem: String? = null
    private var currentStrictMode: Boolean = true

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
     * Show the blocking overlay INSTANTLY.
     * Returns true if overlay was shown, false if failed.
     * Note: TYPE_ACCESSIBILITY_OVERLAY doesn't require SYSTEM_ALERT_WINDOW permission
     * when called from an AccessibilityService.
     */
    fun show(blockedType: String, blockedItem: String?, strictMode: Boolean): Boolean {
        if (isShowing) {
            Log.d(TAG, "Overlay already showing, updating content")
            updateContent(blockedType, blockedItem, strictMode)
            return true
        }

        // Note: We use TYPE_ACCESSIBILITY_OVERLAY which doesn't need canDrawOverlay permission
        // when called from AccessibilityService context

        try {
            currentBlockedType = blockedType
            currentBlockedItem = blockedItem
            currentStrictMode = strictMode

            windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

            // Inflate the overlay layout
            val inflater = LayoutInflater.from(context)
            overlayView = inflater.inflate(R.layout.overlay_blocked, null)

            // Set up the window parameters for instant full-screen overlay
            val layoutParams = WindowManager.LayoutParams().apply {
                width = WindowManager.LayoutParams.MATCH_PARENT
                height = WindowManager.LayoutParams.MATCH_PARENT

                // Use TYPE_APPLICATION_OVERLAY for Android O+ (requires SYSTEM_ALERT_WINDOW permission)
                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
                }

                // Flags for instant appearance and full coverage
                // FLAG_NOT_FOCUSABLE is NOT set - this makes the overlay focusable and able to receive input
                // FLAG_NOT_TOUCH_MODAL prevents touches from passing through to underlying windows
                // FLAG_FULLSCREEN hides the Android navigation bar (back/home/recents buttons)
                // This combination ensures the overlay captures ALL touch events and blocks interaction
                // with the underlying screen until dismissed
                flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_FULLSCREEN

                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.START
                x = 0
                y = 0

                // Handle display cutouts (notches)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }
            }

            // Update content based on block type
            updateViewContent(blockedType, blockedItem, strictMode)

            // Hide system UI (navigation bar and status bar) for immersive blocking
            overlayView?.systemUiVisibility = (View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)

            // Set up tap to dismiss
            overlayView?.findViewById<View>(R.id.overlay_root)?.setOnClickListener {
                vibrate()
                dismiss()
            }

            // Add to window manager
            windowManager?.addView(overlayView, layoutParams)
            isShowing = true

            Log.d(TAG, "Overlay shown for type: $blockedType, item: $blockedItem")
            return true

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show overlay", e)
            return false
        }
    }

    /**
     * Update the content of an already showing overlay
     */
    private fun updateContent(blockedType: String, blockedItem: String?, strictMode: Boolean) {
        currentBlockedType = blockedType
        currentBlockedItem = blockedItem
        currentStrictMode = strictMode
        updateViewContent(blockedType, blockedItem, strictMode)
    }

    /**
     * Update the view content based on block type
     */
    private fun updateViewContent(blockedType: String, blockedItem: String?, strictMode: Boolean) {
        val messageView = overlayView?.findViewById<TextView>(R.id.overlay_message)
        messageView?.text = when (blockedType) {
            TYPE_WEBSITE -> "This website is blocked."
            TYPE_SETTINGS -> "Settings are blocked."
            else -> "This app is blocked."
        }

        // Show "Continue anyway" button only in non-strict mode (and not for settings)
        val continueButton = overlayView?.findViewById<TextView>(R.id.overlay_continue_button)
        if (!strictMode && blockedType != TYPE_SETTINGS && blockedItem != null) {
            continueButton?.visibility = View.VISIBLE
            continueButton?.setOnClickListener {
                vibrate()
                unblockAndContinue()
            }
        } else {
            continueButton?.visibility = View.GONE
        }
    }

    /**
     * Remove the blocked app/website from the blocked list and dismiss
     */
    private fun unblockAndContinue() {
        try {
            val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

            when (currentBlockedType) {
                TYPE_APP -> {
                    val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())?.toMutableSet() ?: mutableSetOf()
                    currentBlockedItem?.let { blockedApps.remove(it) }
                    prefs.edit().putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, blockedApps).apply()
                }
                TYPE_WEBSITE -> {
                    val blockedWebsites = prefs.getStringSet("blocked_websites", emptySet())?.toMutableSet() ?: mutableSetOf()
                    currentBlockedItem?.let { blockedWebsites.remove(it) }
                    prefs.edit().putStringSet("blocked_websites", blockedWebsites).apply()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unblocking item", e)
        }

        // Just dismiss - don't go home, let user continue to the app
        dismissWithoutCallback()
    }

    /**
     * Dismiss the overlay and trigger callback (go home)
     */
    fun dismiss() {
        if (!isShowing) return

        try {
            windowManager?.removeView(overlayView)
        } catch (e: Exception) {
            Log.e(TAG, "Error removing overlay view", e)
        }

        overlayView = null
        windowManager = null
        isShowing = false

        Log.d(TAG, "Overlay dismissed")
        onDismissed?.invoke()
    }

    /**
     * Dismiss without triggering the callback (for "Continue anyway")
     */
    private fun dismissWithoutCallback() {
        if (!isShowing) return

        try {
            windowManager?.removeView(overlayView)
        } catch (e: Exception) {
            Log.e(TAG, "Error removing overlay view", e)
        }

        overlayView = null
        windowManager = null
        isShowing = false

        Log.d(TAG, "Overlay dismissed (continue anyway)")
    }

    /**
     * Check if overlay is currently showing
     */
    fun isShowing(): Boolean = isShowing

    /**
     * Vibrate for haptic feedback
     */
    private fun vibrate() {
        try {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (vibrator?.hasVibrator() == true) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(50)
                }
            }
        } catch (e: Exception) {
            // Ignore vibration errors
        }
    }
}
