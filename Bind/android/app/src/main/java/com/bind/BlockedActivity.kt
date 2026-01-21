package com.bind

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
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

        const val TYPE_APP = "app"
        const val TYPE_WEBSITE = "website"
        const val TYPE_SETTINGS = "settings"

        /**
         * Launch the blocked overlay activity (no animation)
         */
        fun launch(context: Context, blockedType: String = TYPE_APP) {
            val intent = Intent(context, BlockedActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
                putExtra(EXTRA_BLOCKED_TYPE, blockedType)
            }
            context.startActivity(intent)
        }

        /**
         * Launch with explicit no animation (called from AccessibilityService)
         */
        fun launchNoAnimation(context: Context, blockedType: String = TYPE_APP) {
            launch(context, blockedType) // Already has NO_ANIMATION flag
        }
    }

    // Prevent multiple dismiss calls
    private var isDismissing = false

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
        val blockedType = intent.getStringExtra(EXTRA_BLOCKED_TYPE) ?: TYPE_APP
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
    }

    override fun onBackPressed() {
        // Override back button - dismiss and go to home
        dismissAndGoHome()
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
        // Ensure we notify service if destroyed without explicit dismiss
        if (!isDismissing) {
            ScuteAccessibilityService.instance?.onOverlayDismissed()
        }
        super.onDestroy()
    }
}