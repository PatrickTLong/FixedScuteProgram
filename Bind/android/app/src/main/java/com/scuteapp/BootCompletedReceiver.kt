package com.scuteapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * BroadcastReceiver that runs immediately after device boot completes.
 * Checks if there's an active blocking session and restarts the blocking service.
 * This ensures blocking works immediately after phone restart without needing to open the app.
 */
class BootCompletedReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootCompletedReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        Log.d(TAG, "[BOOT] ========== BOOT COMPLETED ==========")

        try {
            val prefs = context.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isSessionActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val sessionEndTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val noTimeLimit = prefs.getBoolean("no_time_limit", false)
            val isScheduledPreset = prefs.getBoolean("is_scheduled_preset", false)
            val activePresetId = prefs.getString("active_preset_id", null)
            val activePresetName = prefs.getString("active_preset_name", null)
            val now = System.currentTimeMillis()

            Log.d(TAG, "[BOOT] Session state: active=$isSessionActive, preset=\"$activePresetName\" (id: $activePresetId)")
            Log.d(TAG, "[BOOT] Timing: endTime=$sessionEndTime (${if (sessionEndTime > 0) java.util.Date(sessionEndTime).toString() else "none"}), noTimeLimit=$noTimeLimit, isScheduled=$isScheduledPreset")
            Log.d(TAG, "[BOOT] Now: $now (${java.util.Date(now)})")

            // Check if there's an active session that hasn't expired
            if (isSessionActive && (noTimeLimit || now < sessionEndTime)) {
                Log.d(TAG, "[BOOT] Active session found: \"$activePresetName\" — starting blocking service")

                val serviceIntent = Intent(context, UninstallBlockerService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }

                Log.d(TAG, "[BOOT] Blocking service started successfully after boot")
            } else if (isSessionActive && !noTimeLimit && now >= sessionEndTime) {
                Log.d(TAG, "[BOOT] Session EXPIRED while phone was off (overdue by ${(now - sessionEndTime) / 1000}s) — cleaning up")
                prefs.edit()
                    .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                    .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                    .putStringSet("blocked_websites", emptySet())
                    .remove("active_preset_id")
                    .remove("active_preset_name")
                    .remove("is_scheduled_preset")
                    .remove("no_time_limit")
                    .apply()
                UninstallBlockerService.showSessionEndedNotification(context, activePresetName)
                Log.d(TAG, "[BOOT] Session cleared, notification shown")
            } else {
                Log.d(TAG, "[BOOT] No active blocking session")
            }

            // Also trigger scheduled preset check
            Log.d(TAG, "[BOOT] Rescheduling all preset alarms...")
            ScheduleManager.rescheduleAllPresets(context)
            Log.d(TAG, "[BOOT] ========== BOOT HANDLING COMPLETE ==========")

        } catch (e: Exception) {
            Log.e(TAG, "[BOOT] Error handling boot completed", e)
        }
    }
}
