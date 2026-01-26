package com.scuteapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.WindowManager
import android.widget.TextView

/**
 * Full-screen overlay activity displayed when user tries to open a blocked app,
 * blocked website, or Settings (if blocked).
 *
 * This activity works even when the Scute app is closed because it's launched
 * directly by the AccessibilityService.
 *
 * The overlay stays on screen until the user taps to dismiss it.
 * On dismiss, user is sent to Android home screen (not Scute app).
 */
class BlockedActivity : Activity() {

    companion object {
        private const val TAG = "BlockedActivity"
        private const val EXTRA_BLOCKED_TYPE = "blocked_type"
        private const val EXTRA_BLOCKED_ITEM = "blocked_item"
        private const val EXTRA_STRICT_MODE = "strict_mode"

        const val TYPE_APP = "app"
        const val TYPE_WEBSITE = "website"
        const val TYPE_SETTINGS = "settings"

        // Flag to ignore back presses during automatic cleanup
        @Volatile
        var ignoreBackPresses = false

        /**
         * Launch the blocked overlay activity (no animation)
         */
        fun launch(context: Context, blockedType: String = TYPE_APP, blockedItem: String? = null, strictMode: Boolean = true) {
            val intent = Intent(context, BlockedActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
                putExtra(EXTRA_BLOCKED_TYPE, blockedType)
                putExtra(EXTRA_BLOCKED_ITEM, blockedItem)
                putExtra(EXTRA_STRICT_MODE, strictMode)
            }
            context.startActivity(intent)
        }

        /**
         * Launch with explicit no animation (called from AccessibilityService)
         */
        fun launchNoAnimation(context: Context, blockedType: String = TYPE_APP, blockedItem: String? = null, strictMode: Boolean = true) {
            launch(context, blockedType, blockedItem, strictMode)
        }
    }

    // Prevent multiple dismiss calls
    private var isDismissing = false

    // Store blocked item info for "Continue anyway" functionality
    private var blockedType: String = TYPE_APP
    private var blockedItem: String? = null
    private var isStrictMode: Boolean = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Disable all window animations for instant appearance
        window.setWindowAnimations(0)

        // Make it a full-screen overlay that appears above everything
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        setContentView(R.layout.activity_blocked)

        // Get the blocked type and customize message
        blockedType = intent.getStringExtra(EXTRA_BLOCKED_TYPE) ?: TYPE_APP
        blockedItem = intent.getStringExtra(EXTRA_BLOCKED_ITEM)
        isStrictMode = intent.getBooleanExtra(EXTRA_STRICT_MODE, true)

        val messageView = findViewById<TextView>(R.id.blocked_message)

        messageView.text = when (blockedType) {
            TYPE_WEBSITE -> "This website is blocked."
            TYPE_SETTINGS -> "Settings are blocked."
            else -> "This app is blocked."
        }

        // Get root view for click handling (no animation - instant appear)
        val rootView = findViewById<View>(R.id.blocked_root)

        // Tap anywhere to dismiss and go to home
        rootView.setOnClickListener {
            dismissAndGoHome()
        }

        // Show "Continue anyway" button only in non-strict mode (and not for settings)
        val continueButton = findViewById<TextView>(R.id.continue_anyway_button)
        if (!isStrictMode && blockedType != TYPE_SETTINGS && blockedItem != null) {
            continueButton.visibility = View.VISIBLE
            continueButton.setOnClickListener { view ->
                // Haptic feedback
                view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                vibrate()
                unblockAndContinue()
            }
        } else {
            continueButton.visibility = View.GONE
        }
    }

    /**
     * Vibrate for haptic feedback
     */
    private fun vibrate() {
        try {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (vibrator?.hasVibrator() == true) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
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

    /**
     * Remove the blocked app/website from the blocked list and dismiss.
     */
    private fun unblockAndContinue() {
        if (isDismissing) return
        isDismissing = true

        try {
            val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

            when (blockedType) {
                TYPE_APP -> {
                    val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())?.toMutableSet() ?: mutableSetOf()
                    blockedItem?.let { blockedApps.remove(it) }
                    prefs.edit().putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, blockedApps).apply()
                }
                TYPE_WEBSITE -> {
                    val blockedWebsites = prefs.getStringSet("blocked_websites", emptySet())?.toMutableSet() ?: mutableSetOf()
                    blockedItem?.let { blockedWebsites.remove(it) }
                    prefs.edit().putStringSet("blocked_websites", blockedWebsites).apply()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unblocking item", e)
        }

        // Just finish - user can now open the app/website
        finish()
    }

    override fun onBackPressed() {
        // Back button is disabled on the blocked overlay
        // User must tap anywhere to dismiss
    }

    private fun dismissAndGoHome() {
        // Prevent multiple dismiss calls (race condition fix)
        if (isDismissing) return
        isDismissing = true

        // Notify service that overlay is being dismissed
        // This also triggers going to home screen
        ScuteAccessibilityService.instance?.onOverlayDismissed()

        finish()
    }

    override fun finish() {
        super.finish()
        // Disable exit animation
        overridePendingTransition(0, 0)
    }

    override fun onDestroy() {
        // Don't call goHome on destroy - only on explicit tap dismiss
        super.onDestroy()
    }
}