package com.bind

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * BroadcastReceiver that handles timer preset end alarms.
 * When a timer-based preset's time expires, this receiver fires to:
 * 1. Show a notification that the session has ended
 * 2. Launch the app to the home screen
 *
 * This works even when the app is closed or the phone was off.
 */
class TimerPresetReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "TimerPresetReceiver"
        const val ACTION_TIMER_END = "com.bind.ACTION_TIMER_END"
        const val EXTRA_PRESET_ID = "preset_id"
        const val EXTRA_PRESET_NAME = "preset_name"

        // Notification channel for timer alerts (high priority, heads-up)
        private const val ALERT_CHANNEL_ID = "scute_timer_alerts"
        private const val TIMER_END_NOTIFICATION_ID = 2003
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Received broadcast: ${intent.action}")

        when (intent.action) {
            ACTION_TIMER_END -> {
                val presetId = intent.getStringExtra(EXTRA_PRESET_ID)
                val presetName = intent.getStringExtra(EXTRA_PRESET_NAME) ?: "Timer"
                handleTimerEnd(context, presetId, presetName)
            }
            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule timer alarm after device reboot if there's an active timer session
                rescheduleTimerAlarmIfNeeded(context)
            }
        }
    }

    private fun handleTimerEnd(context: Context, presetId: String?, presetName: String) {
        try {
            Log.d(TAG, "Timer ended for preset: $presetName (id: $presetId)")

            val sessionPrefs = context.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Check if the session is still active and matches this preset
            val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val activePresetId = sessionPrefs.getString("active_preset_id", null)

            // Only process if session is still active
            if (!isSessionActive) {
                Log.d(TAG, "No active session, skipping timer end notification")
                return
            }

            // If presetId was provided, check if it matches the active preset
            if (presetId != null && activePresetId != null && presetId != activePresetId) {
                Log.d(TAG, "Timer preset ID doesn't match active preset, skipping")
                return
            }

            // Check if this is a scheduled preset (those are handled by ScheduledPresetReceiver)
            val isScheduledPreset = sessionPrefs.getBoolean("is_scheduled_preset", false)
            if (isScheduledPreset) {
                Log.d(TAG, "This is a scheduled preset, letting ScheduledPresetReceiver handle it")
                return
            }

            // Get preset name - use passed name, or fallback to SharedPreferences
            val finalPresetName = if (presetName != "Timer") {
                presetName
            } else {
                sessionPrefs.getString("active_preset_name", null) ?: presetName
            }

            // Clear the session (same as ScheduledPresetReceiver.deactivateScheduledPreset)
            // This allows the app to show "tap to unlock" state
            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .remove("active_preset_id")
                .remove("active_preset_name")
                .remove("timer_alarm_scheduled")
                .remove("timer_alarm_end_time")
                .apply()

            // Stop the foreground service (same as ScheduledPresetReceiver)
            val serviceIntent = Intent(context, UninstallBlockerService::class.java)
            context.stopService(serviceIntent)

            // Show notification that timer has ended (with fullScreenIntent for background launch)
            showTimerEndNotification(context, finalPresetName)

            Log.d(TAG, "Timer end handled for: $presetName - session cleared, service stopped")

        } catch (e: Exception) {
            Log.e(TAG, "Error handling timer end", e)
        }
    }

    /**
     * Show a high-priority heads-up notification when a timer preset ends.
     * This alerts the user that their blocking session timer has expired.
     * User still needs to tap their Scute card to fully unlock.
     *
     * Uses setFullScreenIntent to ensure the app launches even when killed/in background
     * (same approach as ScheduledPresetReceiver).
     */
    private fun showTimerEndNotification(context: Context, presetName: String) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Create the high-priority notification channel (Android 8+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Timer Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts when timer-based blocking sessions end"
                    enableVibration(true)
                    enableLights(true)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            // Create intent to open the app when notification is tapped
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("timer_ended", true)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                TIMER_END_NOTIFICATION_ID,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Create a full-screen intent for launching the app from background
            // This is the key to making the app launch even when killed
            val fullScreenIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                putExtra("timer_ended", true)
            }
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                TIMER_END_NOTIFICATION_ID + 1000, // Different request code
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Build the notification with high priority and fullScreenIntent for background launch
            val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
                .setContentTitle("Session Ended")
                .setContentText("\"$presetName\" has ended. Tap to unlock.")
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setFullScreenIntent(fullScreenPendingIntent, true) // This launches app from background
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound, vibrate, lights
                .build()

            notificationManager.notify(TIMER_END_NOTIFICATION_ID, notification)

            // Also try direct launch as backup (works when app has foreground permission)
            try {
                val appLaunchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (appLaunchIntent != null) {
                    appLaunchIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    )
                    appLaunchIntent.putExtra("timer_ended", true)
                    context.startActivity(appLaunchIntent)
                    Log.d(TAG, "Launched app for timer end via direct startActivity")
                }
            } catch (e: Exception) {
                Log.d(TAG, "Direct startActivity failed (expected on Android 10+), fullScreenIntent will handle it", e)
            }

            Log.d(TAG, "Showed timer end notification for: $presetName")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show timer end notification", e)
        }
    }

    /**
     * Reschedule timer alarm after device reboot if there's an active timer session.
     * If timer already expired while phone was off, handle it immediately (clear session, show notification).
     */
    private fun rescheduleTimerAlarmIfNeeded(context: Context) {
        try {
            val sessionPrefs = context.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val isScheduledPreset = sessionPrefs.getBoolean("is_scheduled_preset", false)
            val endTime = sessionPrefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val noTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)

            // Only reschedule for timer presets (not scheduled presets or no-time-limit)
            if (!isSessionActive || isScheduledPreset || noTimeLimit || endTime == 0L) {
                return
            }

            val now = System.currentTimeMillis()
            if (now >= endTime) {
                // Timer already expired while phone was off - handle it now
                val presetName = sessionPrefs.getString("active_preset_name", "Timer") ?: "Timer"

                // Clear the session (same as handleTimerEnd)
                sessionPrefs.edit()
                    .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                    .remove("active_preset_id")
                    .remove("active_preset_name")
                    .remove("timer_alarm_scheduled")
                    .remove("timer_alarm_end_time")
                    .apply()

                // Stop the foreground service
                val serviceIntent = Intent(context, UninstallBlockerService::class.java)
                context.stopService(serviceIntent)

                // Show notification and launch app
                showTimerEndNotification(context, presetName)

                Log.d(TAG, "Timer expired during phone off - session cleared for: $presetName")
            } else {
                // Reschedule the alarm
                val presetId = sessionPrefs.getString("active_preset_id", null)
                val presetName = sessionPrefs.getString("active_preset_name", "Timer") ?: "Timer"
                TimerAlarmManager.scheduleTimerEnd(context, endTime, presetId, presetName)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error rescheduling timer alarm", e)
        }
    }
}
