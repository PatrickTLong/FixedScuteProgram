package com.bind

import android.content.Context
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
    }

    override fun onListenerDisconnected() {
        isRunning = false
        Log.d(TAG, "Notification listener disconnected")
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val packageName = sbn.packageName

        // Don't block our own notifications
        if (packageName == "com.bind") return

        // Check if this app's notifications should be blocked
        if (shouldBlockNotification(packageName)) {
            Log.d(TAG, "Blocking notification from: $packageName")
            cancelNotification(sbn.key)
        }
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
