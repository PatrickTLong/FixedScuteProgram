package com.bind

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.view.animation.AlphaAnimation
import android.widget.TextView

/**
 * Full-screen overlay activity displayed when user tries to open a blocked app,
 * blocked website, or Settings (if blocked).
 *
 * This activity works even when the Scute app is closed because it's launched
 * directly by the AccessibilityService.
 *
 * The overlay stays on screen until the user taps to dismiss it.
 */
class BlockedActivity : Activity() {

    companion object {
        private const val TAG = "BlockedActivity"
        private const val EXTRA_BLOCKED_TYPE = "blocked_type"

        const val TYPE_APP = "app"
        const val TYPE_WEBSITE = "website"
        const val TYPE_SETTINGS = "settings"

        /**
         * Launch the blocked overlay activity
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
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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

        // Get root view for animation and click handling
        val rootView = findViewById<View>(R.id.blocked_root)

        // Fade-in animation
        val fadeIn = AlphaAnimation(0f, 1f).apply {
            duration = 300
            fillAfter = true
        }
        rootView.startAnimation(fadeIn)

        // Tap anywhere to dismiss (spam back + clear recents)
        rootView.setOnClickListener {
            dismissAndBlock()
        }
    }

    override fun onBackPressed() {
        // Override back button - dismiss with aggressive blocking
        dismissAndBlock()
    }

    private fun dismissAndBlock() {
        // Press back 5 times then open Scute app
        ScuteAccessibilityService.instance?.spamBackButton(5)

        // After back presses complete, open Scute app
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            openScuteApp()
        }, 5 * 150L + 100L) // Wait for back presses to complete + small buffer

        finish()
        overridePendingTransition(0, 0) // No animation
    }

    private fun openScuteApp() {
        val intent = packageManager.getLaunchIntentForPackage("com.bind")
        intent?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            it.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            // Signal that we came from the blocked overlay so app redirects to home
            it.putExtra("from_blocked_overlay", true)
            startActivity(it)
        }
    }
}
