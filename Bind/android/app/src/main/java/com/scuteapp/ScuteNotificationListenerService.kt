package com.scuteapp

import android.content.Context
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Notification Listener Service for monitoring notifications.
 * This allows Scute to appear in Notification Access settings.
 * Also blocks notifications from apps that are currently blocked during an active session.
 */
class ScuteNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "ScuteNotificationListener"

        @Volatile
        var isRunning = false
            private set
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        isRunning = true
        Log.d(TAG, "Notification listener connected")
        // Dismiss any existing "displaying over other apps" notifications
        try {
            for (sbn in activeNotifications) {
                if (isOverlayNotification(sbn)) {
                    dismissOverlayNotification(sbn)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing existing overlay notifications", e)
        }
    }

    override fun onListenerDisconnected() {
        isRunning = false
        Log.d(TAG, "Notification listener disconnected")
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val packageName = sbn.packageName

        // Log all system notifications to help debug overlay notification detection
        if (packageName == "android" || packageName == "com.android.systemui" || packageName == "com.android.server.notification") {
            val notification = sbn.notification
            val extras = notification?.extras
            val title = extras?.getCharSequence("android.title")?.toString() ?: ""
            val text = extras?.getCharSequence("android.text")?.toString() ?: ""
            val channelId = notification?.channelId ?: ""
            Log.d(TAG, "SYSTEM NOTIFICATION: pkg=$packageName, channel=$channelId, title='$title', text='$text', key=${sbn.key}, tag=${sbn.tag}")
        }

        // Hide the "displaying over other apps" system notification
        if (isOverlayNotification(sbn)) {
            dismissOverlayNotification(sbn)
            return
        }

        // Don't block our own notifications
        if (packageName == "com.scuteapp") return

        // Check if this app's notifications should be blocked
        if (shouldBlockNotification(packageName)) {
            Log.d(TAG, "Blocking notification from: $packageName")
            cancelNotification(sbn.key)
        }
    }

    /**
     * Try multiple strategies to dismiss the overlay notification.
     * cancelNotification doesn't work on this protected system notification,
     * so we use snoozeNotification to hide it for a long duration.
     */
    private fun dismissOverlayNotification(sbn: StatusBarNotification) {
        try {
            Log.d(TAG, "Attempting to dismiss overlay notification: pkg=${sbn.packageName}, key=${sbn.key}")

            // Strategy 1: Snooze for a very long time (effectively hides it)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    // Snooze for 30 days (max practical duration)
                    snoozeNotification(sbn.key, 30L * 24 * 60 * 60 * 1000)
                    Log.d(TAG, "Snoozed overlay notification successfully")
                    return
                } catch (e: Exception) {
                    Log.w(TAG, "snoozeNotification failed, trying cancelNotification", e)
                }
            }

            // Strategy 2: Try cancel as fallback
            cancelNotification(sbn.key)
            Log.d(TAG, "Called cancelNotification as fallback")
        } catch (e: Exception) {
            Log.e(TAG, "All dismiss strategies failed", e)
        }
    }

    private fun isOverlayNotification(sbn: StatusBarNotification): Boolean {
        val packageName = sbn.packageName
        // Only check system packages
        if (packageName != "android" && packageName != "com.android.systemui" && packageName != "com.android.server.notification") {
            return false
        }

        val notification = sbn.notification ?: return false

        // Check channel ID first (most reliable - matches the exact channel from logs)
        val channelId = notification.channelId ?: ""
        if (channelId.contains("AlertWindowNotification") ||
            channelId == "ALERT_WINDOW_NOTIFICATION_CHANNEL" ||
            channelId == "alert_window") {
            return true
        }

        // Check notification text content
        val extras = notification.extras ?: return false
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val combined = "$title $text".lowercase()

        // Match various phrasings across Android versions and OEM skins
        return combined.contains("displaying over") ||
               combined.contains("appear on top") ||
               combined.contains("over other apps") ||
               combined.contains("screen overlay") ||
               combined.contains("draw over") ||
               (combined.contains("scute") && (combined.contains("overlay") || combined.contains("top") || combined.contains("over")))
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Can be used to track notification dismissals if needed
    }

    /**
     * Check if notifications from this package should be blocked.
     * Notifications are blocked if:
     * 1. There's an active blocking session
     * 2. The session hasn't expired
     * 3. The package is in the blocked apps list
     */
    private fun shouldBlockNotification(packageName: String): Boolean {
        try {
            val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

            // Check if session is active
            val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            if (!isActive) return false

            // Check if session has expired
            val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            if (System.currentTimeMillis() > endTime) return false

            // Check if this package is in the blocked list
            val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
            return blockedApps?.contains(packageName) == true
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if notification should be blocked", e)
            return false
        }
    }
}
