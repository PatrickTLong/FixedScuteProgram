package com.scuteapp

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.os.VibrationEffect
import android.os.Vibrator
import android.widget.ImageView
import android.widget.TextView
import java.io.ByteArrayOutputStream

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

        // Haptic feedback on tap-to-dismiss — flip to true to enable
        const val HAPTIC_ON_DISMISS = false
        const val HAPTIC_DURATION_MS = 50L
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var isShowing = false
    private var isTransitioning = false

    // Callback when overlay is dismissed
    var onDismissed: (() -> Unit)? = null

    // Store current block info for "Continue anyway"
    private var currentBlockedType: String = TYPE_APP
    private var currentBlockedItem: String? = null
    private var currentBlockedName: String? = null
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
    fun show(blockedType: String, blockedItem: String?, blockedName: String?, strictMode: Boolean): Boolean {
        if (isShowing) {
            Log.d(TAG, "Overlay already showing, updating content")
            updateContent(blockedType, blockedItem, blockedName, strictMode)
            return true
        }

        // Note: We use TYPE_ACCESSIBILITY_OVERLAY which doesn't need canDrawOverlay permission
        // when called from AccessibilityService context

        try {
            currentBlockedType = blockedType
            currentBlockedItem = blockedItem
            currentBlockedName = blockedName
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
                // FLAG_NOT_FOCUSABLE is NOT set - this makes the overlay focusable and captures all touches
                // FLAG_FULLSCREEN hides the Android navigation bar (back/home/recents buttons)
                // FLAG_ALT_FOCUSABLE_IM prevents keyboard from pushing/adjusting the overlay
                flags = WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_FULLSCREEN or
                        WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM

                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.START
                x = 0
                y = 0

                // Prevent keyboard from adjusting/resizing the overlay
                softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN or
                                WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING

                // Handle display cutouts (notches)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }
            }

            // Update content based on block type
            updateViewContent(blockedType, blockedItem, blockedName, strictMode)

            // Hide navigation and status bar (matching BlockedActivity's fullscreen theme)
            overlayView?.systemUiVisibility = (View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)

            // Add to window manager
            windowManager?.addView(overlayView, layoutParams)
            isShowing = true
            isTransitioning = true

            // Disable clicks during transition
            overlayView?.isClickable = false
            overlayView?.findViewById<View>(R.id.overlay_root)?.isClickable = false

            // Fade in + scale animation (300ms)
            overlayView?.alpha = 0f
            overlayView?.scaleX = 0.95f
            overlayView?.scaleY = 0.95f

            val fadeIn = ObjectAnimator.ofFloat(overlayView, "alpha", 0f, 1f)
            val scaleX = ObjectAnimator.ofFloat(overlayView, "scaleX", 0.95f, 1f)
            val scaleY = ObjectAnimator.ofFloat(overlayView, "scaleY", 0.95f, 1f)

            AnimatorSet().apply {
                playTogether(fadeIn, scaleX, scaleY)
                duration = 300
                interpolator = DecelerateInterpolator()
                addListener(object : android.animation.Animator.AnimatorListener {
                    override fun onAnimationStart(animation: android.animation.Animator) {}
                    override fun onAnimationRepeat(animation: android.animation.Animator) {}
                    override fun onAnimationCancel(animation: android.animation.Animator) {
                        enableInteraction()
                    }
                    override fun onAnimationEnd(animation: android.animation.Animator) {
                        enableInteraction()
                    }
                })
                start()
            }

            Log.d(TAG, "Overlay shown for type: $blockedType, item: $blockedItem")
            return true

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show overlay", e)
            return false
        }
    }

    /**
     * Enable interaction after fade-in animation completes
     */
    private fun enableInteraction() {
        isTransitioning = false
        overlayView?.isClickable = true

        // Set up tap to dismiss
        overlayView?.findViewById<View>(R.id.overlay_root)?.apply {
            isClickable = true
            setOnClickListener {
                if (!isTransitioning) {
                    if (HAPTIC_ON_DISMISS) {
                        try {
                            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                            if (vibrator?.hasVibrator() == true) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    vibrator.vibrate(VibrationEffect.createOneShot(HAPTIC_DURATION_MS, VibrationEffect.DEFAULT_AMPLITUDE))
                                } else {
                                    @Suppress("DEPRECATION")
                                    vibrator.vibrate(HAPTIC_DURATION_MS)
                                }
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Haptic feedback failed", e)
                        }
                    }
                    dismiss()
                }
            }
        }
    }

    /**
     * Update the content of an already showing overlay
     */
    private fun updateContent(blockedType: String, blockedItem: String?, blockedName: String?, strictMode: Boolean) {
        currentBlockedType = blockedType
        currentBlockedItem = blockedItem
        currentBlockedName = blockedName
        currentStrictMode = strictMode
        updateViewContent(blockedType, blockedItem, blockedName, strictMode)
    }

    /**
     * Update the view content based on block type
     */
    private fun updateViewContent(blockedType: String, blockedItem: String?, blockedName: String?, strictMode: Boolean) {
        // Get views
        val appIconView = overlayView?.findViewById<ImageView>(R.id.overlay_app_icon)
        val messageView = overlayView?.findViewById<TextView>(R.id.overlay_message)

        // Update message text with app/website name
        messageView?.text = when (blockedType) {
            TYPE_WEBSITE -> {
                val displayName = blockedName ?: blockedItem ?: "This website"
                "$displayName is blocked."
            }
            TYPE_SETTINGS -> "Settings are blocked."
            else -> {
                val displayName = blockedName ?: "This app"
                "$displayName is blocked."
            }
        }

        // Always show the blocked app/website icon in the center
        if (blockedType == TYPE_APP || blockedType == TYPE_SETTINGS) {
            // For apps and settings, show Android icon
            try {
                appIconView?.setImageResource(R.drawable.ic_android)
                appIconView?.visibility = View.VISIBLE
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load Android icon", e)
                appIconView?.visibility = View.GONE
            }
        } else if (blockedType == TYPE_WEBSITE) {
            // For websites, show globe icon
            try {
                appIconView?.setImageResource(R.drawable.ic_globe)
                appIconView?.visibility = View.VISIBLE
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load globe icon", e)
                appIconView?.visibility = View.GONE
            }
        } else {
            // For unknown types, hide the center icon (Scute logo is in top-left)
            appIconView?.visibility = View.GONE
        }

    }

    /**
     * Dismiss the overlay and trigger callback (go home)
     */
    fun dismiss() {
        if (!isShowing) return
        fadeOutAndDismiss(withCallback = true)
    }

    /**
     * Fade out the overlay and dismiss
     */
    private fun fadeOutAndDismiss(withCallback: Boolean) {
        if (!isShowing || isTransitioning) return

        isTransitioning = true

        // Disable interaction during fade out
        overlayView?.isClickable = false
        overlayView?.findViewById<View>(R.id.overlay_root)?.isClickable = false

        // Fade out + scale down animation (150ms)
        val fadeOut = ObjectAnimator.ofFloat(overlayView, "alpha", 1f, 0f)
        val scaleX = ObjectAnimator.ofFloat(overlayView, "scaleX", 1f, 0.95f)
        val scaleY = ObjectAnimator.ofFloat(overlayView, "scaleY", 1f, 0.95f)

        AnimatorSet().apply {
            playTogether(fadeOut, scaleX, scaleY)
            duration = 200
            interpolator = DecelerateInterpolator()
            addListener(object : android.animation.Animator.AnimatorListener {
                override fun onAnimationStart(animation: android.animation.Animator) {}
                override fun onAnimationRepeat(animation: android.animation.Animator) {}
                override fun onAnimationCancel(animation: android.animation.Animator) {
                    // Ensure animation visually completes before removal
                    overlayView?.postDelayed({
                        finalizeDismiss(withCallback)
                    }, 50)
                }
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    // Ensure animation visually completes before removal
                    overlayView?.postDelayed({
                        finalizeDismiss(withCallback)
                    }, 50)
                }
            })
            start()
        }
    }

    /**
     * Complete the dismissal after animation
     */
    private fun finalizeDismiss(withCallback: Boolean) {
        try {
            windowManager?.removeView(overlayView)
        } catch (e: Exception) {
            Log.e(TAG, "Error removing overlay view", e)
        }

        overlayView = null
        windowManager = null
        isShowing = false
        isTransitioning = false

        if (withCallback) {
            Log.d(TAG, "Overlay dismissed")
            onDismissed?.invoke()
        } else {
            Log.d(TAG, "Overlay dismissed (continue anyway)")
        }
    }

    /**
     * Check if overlay is currently showing
     */
    fun isShowing(): Boolean = isShowing

}
