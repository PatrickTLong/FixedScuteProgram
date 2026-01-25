package com.scuteapp

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Manages scheduling of timer preset end alarms using AlarmManager.
 * This ensures timer end notifications work even when app is closed or phone is off.
 */
object TimerAlarmManager {

    private const val TAG = "TimerAlarmManager"

    /**
     * Schedule an alarm for when a timer preset should end.
     * This will trigger TimerPresetReceiver to show notification and launch app.
     */
    fun scheduleTimerEnd(context: Context, endTime: Long, presetId: String?, presetName: String) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, TimerPresetReceiver::class.java).apply {
                action = TimerPresetReceiver.ACTION_TIMER_END
                putExtra(TimerPresetReceiver.EXTRA_PRESET_ID, presetId)
                putExtra(TimerPresetReceiver.EXTRA_PRESET_NAME, presetName)
            }

            val requestCode = "timer_end".hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Schedule using the most reliable method available
            val scheduled = scheduleExactAlarm(context, alarmManager, endTime, pendingIntent)

            if (scheduled) {
                // Save that we have a timer alarm scheduled
                val sessionPrefs = context.getSharedPreferences(
                    UninstallBlockerService.PREFS_NAME,
                    Context.MODE_PRIVATE
                )
                sessionPrefs.edit()
                    .putBoolean("timer_alarm_scheduled", true)
                    .putLong("timer_alarm_end_time", endTime)
                    .apply()

                Log.d(TAG, "Scheduled timer end alarm for $presetName at ${java.util.Date(endTime)}")
            } else {
                Log.e(TAG, "Failed to schedule timer end alarm - permission not granted")
            }

        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException scheduling timer end - permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling timer end", e)
        }
    }

    /**
     * Cancel any pending timer end alarm.
     */
    fun cancelTimerAlarm(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, TimerPresetReceiver::class.java).apply {
                action = TimerPresetReceiver.ACTION_TIMER_END
            }

            val requestCode = "timer_end".hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            alarmManager.cancel(pendingIntent)

            // Clear the timer alarm flag
            val sessionPrefs = context.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            sessionPrefs.edit()
                .remove("timer_alarm_scheduled")
                .remove("timer_alarm_end_time")
                .apply()

            Log.d(TAG, "Cancelled timer end alarm")

        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling timer alarm", e)
        }
    }

    /**
     * Try to schedule an exact alarm using the best available method.
     * Similar to ScheduleManager's approach for maximum reliability.
     */
    private fun scheduleExactAlarm(
        context: Context,
        alarmManager: AlarmManager,
        triggerTime: Long,
        pendingIntent: PendingIntent
    ): Boolean {
        // On Android 12+, check if we have permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                Log.w(TAG, "Cannot schedule exact alarms - permission not granted")
                // Fall back to inexact alarm (may be delayed by system)
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
                return true // Still scheduled, just not exact
            }
        }

        // Use setAlarmClock - most reliable, shows alarm icon in status bar
        // This is treated as a user-visible alarm and gets highest priority
        try {
            val showIntent = Intent(context, MainActivity::class.java)
            val showPendingIntent = PendingIntent.getActivity(
                context,
                0,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showPendingIntent)
            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            Log.d(TAG, "Scheduled using setAlarmClock")
            return true
        } catch (e: SecurityException) {
            Log.w(TAG, "setAlarmClock failed, trying setExactAndAllowWhileIdle", e)
        }

        // Fallback to setExactAndAllowWhileIdle
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
                Log.d(TAG, "Scheduled using setExactAndAllowWhileIdle")
                return true
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "setExactAndAllowWhileIdle failed", e)
        }

        // Last resort - inexact alarm
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerTime,
            pendingIntent
        )
        Log.d(TAG, "Scheduled using setAndAllowWhileIdle (inexact)")
        return true
    }
}
