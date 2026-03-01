package com.scuteapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.widget.ImageView
import android.widget.TextView
import java.net.URL
import kotlin.concurrent.thread

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
        private const val EXTRA_CUSTOM_BLOCKED_TEXT = "custom_blocked_text"
        private const val EXTRA_CUSTOM_BLOCKED_TEXT_COLOR = "custom_blocked_text_color"
        private const val EXTRA_CUSTOM_OVERLAY_IMAGE = "custom_overlay_image"
        private const val EXTRA_CUSTOM_OVERLAY_IMAGE_SIZE = "custom_overlay_image_size"

        const val TYPE_APP = "app"
        const val TYPE_WEBSITE = "website"
        const val TYPE_SETTINGS = "settings"

        // Flag to ignore back presses during automatic cleanup
        @Volatile
        var ignoreBackPresses = false

        /**
         * Launch the blocked overlay activity (no animation)
         */
        fun launch(context: Context, blockedType: String = TYPE_APP, blockedItem: String? = null, strictMode: Boolean = true, customBlockedText: String = "", customBlockedTextColor: String = "", customOverlayImage: String = "", customOverlayImageSize: Int = 120) {
            val intent = Intent(context, BlockedActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
                putExtra(EXTRA_BLOCKED_TYPE, blockedType)
                putExtra(EXTRA_BLOCKED_ITEM, blockedItem)
                putExtra(EXTRA_STRICT_MODE, strictMode)
                putExtra(EXTRA_CUSTOM_BLOCKED_TEXT, customBlockedText)
                putExtra(EXTRA_CUSTOM_BLOCKED_TEXT_COLOR, customBlockedTextColor)
                putExtra(EXTRA_CUSTOM_OVERLAY_IMAGE, customOverlayImage)
                putExtra(EXTRA_CUSTOM_OVERLAY_IMAGE_SIZE, customOverlayImageSize)
            }
            context.startActivity(intent)
        }

        /**
         * Launch with explicit no animation (called from AccessibilityService)
         */
        fun launchNoAnimation(context: Context, blockedType: String = TYPE_APP, blockedItem: String? = null, strictMode: Boolean = true, customBlockedText: String = "", customBlockedTextColor: String = "", customOverlayImage: String = "", customOverlayImageSize: Int = 120) {
            launch(context, blockedType, blockedItem, strictMode, customBlockedText, customBlockedTextColor, customOverlayImage, customOverlayImageSize)
        }
    }

    // Prevent multiple dismiss calls
    private var isDismissing = false

    // Store blocked item info
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
        val customBlockedText = intent.getStringExtra(EXTRA_CUSTOM_BLOCKED_TEXT) ?: ""
        val customBlockedTextColor = intent.getStringExtra(EXTRA_CUSTOM_BLOCKED_TEXT_COLOR) ?: ""
        val customOverlayImage = intent.getStringExtra(EXTRA_CUSTOM_OVERLAY_IMAGE) ?: ""
        val customOverlayImageSize = intent.getIntExtra(EXTRA_CUSTOM_OVERLAY_IMAGE_SIZE, 120)

        Log.d(TAG, "onCreate: type=$blockedType, item=$blockedItem, customText='$customBlockedText', customTextColor='$customBlockedTextColor', customImage='$customOverlayImage', imageSize=$customOverlayImageSize")

        val messageView = findViewById<TextView>(R.id.blocked_message)

        messageView.text = if (customBlockedText.isNotEmpty()) {
            customBlockedText
        } else {
            when (blockedType) {
                TYPE_WEBSITE -> "This website is blocked."
                TYPE_SETTINGS -> "Settings are blocked."
                else -> "This app is blocked."
            }
        }

        // Apply custom text color if provided
        if (customBlockedTextColor.isNotEmpty()) {
            try {
                messageView.setTextColor(Color.parseColor(customBlockedTextColor))
            } catch (e: Exception) {
                Log.w(TAG, "Invalid custom text color: $customBlockedTextColor", e)
            }
        }

        // Load custom overlay image if provided (replaces center icon)
        if (customOverlayImage.isNotEmpty()) {
            val appIconView = findViewById<ImageView>(R.id.blocked_app_icon)
            if (appIconView != null) {
                // Apply custom size
                val density = resources.displayMetrics.density
                val sizePx = (customOverlayImageSize * density).toInt()
                appIconView.layoutParams.width = sizePx
                appIconView.layoutParams.height = sizePx
                appIconView.requestLayout()

                thread {
                    try {
                        val inputStream = URL(customOverlayImage).openStream()
                        val bitmap = BitmapFactory.decodeStream(inputStream)
                        inputStream.close()
                        if (bitmap != null) {
                            runOnUiThread {
                                appIconView.setImageBitmap(bitmap)
                                appIconView.visibility = View.VISIBLE
                            }
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to load custom overlay image", e)
                    }
                }
            }
        }

        // Get root view for click handling (no animation - instant appear)
        val rootView = findViewById<View>(R.id.blocked_root)

        // Tap anywhere to dismiss and go to home (with heavy haptic)
        rootView.setOnClickListener {
            try {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (vibrator?.hasVibrator() == true) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(50L, VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(50L)
                    }
                }
            } catch (_: Exception) {}
            dismissAndGoHome()
        }

    }

    override fun onBackPressed() {
        // Back button is disabled on the blocked overlay
        // User must tap anywhere to dismiss
    }

    private fun dismissAndGoHome() {
        Log.d(TAG, "[ACTIVITY-BLOCK] dismissAndGoHome called — isDismissing=$isDismissing")
        // Prevent multiple dismiss calls (race condition fix)
        if (isDismissing) {
            Log.d(TAG, "[ACTIVITY-BLOCK] SKIPPED — already dismissing")
            return
        }
        isDismissing = true

        // Notify service that overlay is being dismissed
        // This also triggers going to home screen
        val result = ScuteAccessibilityService.instance?.onOverlayDismissed()
        Log.d(TAG, "[ACTIVITY-BLOCK] onOverlayDismissed result=$result, accessibilityInstance=${ScuteAccessibilityService.instance != null}")

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