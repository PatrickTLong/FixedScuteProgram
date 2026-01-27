package com.scuteapp

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log

/**
 * Intercepts Settings intents before the Settings app opens.
 * This activity is enabled/disabled dynamically based on whether Settings blocking is active.
 *
 * When enabled, this intercepts ALL Settings-related intents (main Settings, WiFi, Bluetooth, etc.)
 * and shows the blocked overlay instead of allowing Settings to open.
 */
class SettingsInterceptorActivity : Activity() {

    companion object {
        private const val TAG = "SettingsInterceptor"

        /**
         * Enable/disable the interceptor based on blocking status.
         * Call this when starting/stopping a blocking session with Settings blocking enabled.
         */
        fun setEnabled(context: Context, enabled: Boolean) {
            try {
                val componentName = android.content.ComponentName(
                    context,
                    SettingsInterceptorActivity::class.java
                )

                val newState = if (enabled) {
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                } else {
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                }

                context.packageManager.setComponentEnabledSetting(
                    componentName,
                    newState,
                    PackageManager.DONT_KILL_APP
                )

                Log.d(TAG, "Settings interceptor ${if (enabled) "enabled" else "disabled"}")
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling Settings interceptor", e)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if Settings blocking is active
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        val isSessionActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)

        if (!isSessionActive || System.currentTimeMillis() > prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)) {
            // Session not active or expired - disable interceptor and finish
            setEnabled(this, false)
            finish()
            return
        }

        // Check if strict mode is enabled
        val strictMode = prefs.getBoolean("strict_mode", true)

        // Log which Settings intent was intercepted
        val action = intent?.action
        Log.d(TAG, "Intercepted Settings intent: $action")

        // Show blocked overlay for Settings
        BlockedActivity.launchNoAnimation(
            this,
            BlockedOverlayManager.TYPE_SETTINGS,
            "com.android.settings",
            strictMode
        )

        finish()
    }
}
