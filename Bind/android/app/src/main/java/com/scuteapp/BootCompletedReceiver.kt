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

        Log.d(TAG, "Boot completed - checking for active blocking session")

        try {
            val prefs = context.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isSessionActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val sessionEndTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val now = System.currentTimeMillis()

            Log.d(TAG, "Session active: $isSessionActive, End time: $sessionEndTime, Now: $now")

            // Check if there's an active session that hasn't expired
            if (isSessionActive && now < sessionEndTime) {
                val presetName = prefs.getString("active_preset_name", "Unknown")
                Log.d(TAG, "Active session found: $presetName - starting blocking service")

                // Start the blocking service immediately
                val serviceIntent = Intent(context, UninstallBlockerService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }

                Log.d(TAG, "Blocking service started successfully after boot")
            } else if (isSessionActive && now >= sessionEndTime) {
                // Session has expired while phone was off - clean up
                Log.d(TAG, "Session expired while phone was off - cleaning up")
                prefs.edit()
                    .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                    .remove("active_preset_id")
                    .remove("active_preset_name")
                    .apply()
            } else {
                Log.d(TAG, "No active blocking session found")
            }

            // Also trigger scheduled preset check (existing behavior)
            ScheduleManager.rescheduleAllPresets(context)

        } catch (e: Exception) {
            Log.e(TAG, "Error handling boot completed", e)
        }
    }
}
