package com.bind

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Manages scheduling of preset alarms using AlarmManager.
 */
object ScheduleManager {

    private const val TAG = "ScheduleManager"
    const val PREFS_NAME = "scute_schedule_prefs"
    const val KEY_SCHEDULED_PRESETS = "scheduled_presets"

    /**
     * Check if we can schedule exact alarms
     */
    fun canScheduleExactAlarms(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }
    }

    /**
     * Save scheduled presets and schedule alarms for them
     */
    fun saveScheduledPresets(context: Context, presetsJson: String) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_SCHEDULED_PRESETS, presetsJson).apply()

            // Cancel existing alarms and reschedule
            rescheduleAllPresets(context)

            Log.d(TAG, "Saved and scheduled presets")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving scheduled presets", e)
        }
    }

    /**
     * Reschedule all preset alarms (called after boot or when presets change)
     */
    fun rescheduleAllPresets(context: Context) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val presetsJson = prefs.getString(KEY_SCHEDULED_PRESETS, null)

            if (presetsJson == null) {
                Log.d(TAG, "No scheduled presets to reschedule")
                return
            }

            val presetsArray = JSONArray(presetsJson)
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val now = System.currentTimeMillis()

            for (i in 0 until presetsArray.length()) {
                val preset = presetsArray.getJSONObject(i)
                val presetId = preset.getString("id")
                val isActive = preset.optBoolean("isActive", false)
                val isScheduled = preset.optBoolean("isScheduled", false)
                val startDate = preset.optString("scheduleStartDate", null)
                val endDate = preset.optString("scheduleEndDate", null)

                // Only schedule if active and scheduled with valid dates
                if (!isActive || !isScheduled || startDate == null) {
                    cancelPresetAlarm(context, presetId)
                    continue
                }

                val startTime = parseIsoDate(startDate)
                val endTime = if (endDate != null) parseIsoDate(endDate) else Long.MAX_VALUE

                // Check if schedule is still valid
                if (now >= endTime) {
                    // Schedule has ended
                    Log.d(TAG, "Preset $presetId schedule has ended")
                    cancelPresetAlarm(context, presetId)
                    continue
                }

                if (now >= startTime && now < endTime) {
                    // We're currently in the schedule window - check if already active
                    val sessionPrefs = context.getSharedPreferences(
                        UninstallBlockerService.PREFS_NAME,
                        Context.MODE_PRIVATE
                    )
                    val currentActiveId = sessionPrefs.getString("active_preset_id", null)
                    val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)

                    if (isSessionActive && currentActiveId == presetId) {
                        Log.d(TAG, "Preset $presetId is already active, skipping")
                    } else {
                        Log.d(TAG, "Preset $presetId is currently in schedule window, activating now")
                        activatePresetNow(context, presetId)
                    }
                } else if (now < startTime) {
                    // Schedule hasn't started yet - set alarm
                    schedulePresetStart(context, presetId, startTime)
                }
            }

            Log.d(TAG, "Rescheduled all presets")
        } catch (e: Exception) {
            Log.e(TAG, "Error rescheduling presets", e)
        }
    }

    /**
     * Schedule an alarm to start a preset at the given time
     */
    fun schedulePresetStart(context: Context, presetId: String, startTime: Long) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, ScheduledPresetReceiver::class.java).apply {
                action = ScheduledPresetReceiver.ACTION_ACTIVATE_PRESET
                putExtra(ScheduledPresetReceiver.EXTRA_PRESET_ID, presetId)
            }

            val requestCode = presetId.hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Try to schedule using the most reliable method available
            val scheduled = scheduleExactAlarm(context, alarmManager, startTime, pendingIntent)

            if (scheduled) {
                Log.d(TAG, "Scheduled preset $presetId to start at ${java.util.Date(startTime)}")
            } else {
                Log.e(TAG, "Failed to schedule preset $presetId - exact alarm permission not granted")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException scheduling preset start - permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling preset start", e)
        }
    }

    /**
     * Try to schedule an exact alarm using the best available method
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

    /**
     * Schedule an alarm to end a preset at the given time
     */
    fun schedulePresetEnd(context: Context, presetId: String, endTime: Long) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, ScheduledPresetReceiver::class.java).apply {
                action = "com.bind.ACTION_END_PRESET"
                putExtra(ScheduledPresetReceiver.EXTRA_PRESET_ID, presetId)
            }

            val requestCode = (presetId + "_end").hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Try to schedule using the most reliable method available
            val scheduled = scheduleExactAlarm(context, alarmManager, endTime, pendingIntent)

            if (scheduled) {
                Log.d(TAG, "Scheduled preset $presetId to end at ${java.util.Date(endTime)}")
            } else {
                Log.e(TAG, "Failed to schedule preset $presetId end - exact alarm permission not granted")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException scheduling preset end - permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling preset end", e)
        }
    }

    /**
     * Cancel alarm for a specific preset
     */
    fun cancelPresetAlarm(context: Context, presetId: String) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // Cancel start alarm
            val startIntent = Intent(context, ScheduledPresetReceiver::class.java).apply {
                action = ScheduledPresetReceiver.ACTION_ACTIVATE_PRESET
                putExtra(ScheduledPresetReceiver.EXTRA_PRESET_ID, presetId)
            }
            val startPendingIntent = PendingIntent.getBroadcast(
                context,
                presetId.hashCode(),
                startIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(startPendingIntent)

            // Cancel end alarm
            val endIntent = Intent(context, ScheduledPresetReceiver::class.java).apply {
                action = "com.bind.ACTION_END_PRESET"
                putExtra(ScheduledPresetReceiver.EXTRA_PRESET_ID, presetId)
            }
            val endPendingIntent = PendingIntent.getBroadcast(
                context,
                (presetId + "_end").hashCode(),
                endIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(endPendingIntent)

            Log.d(TAG, "Cancelled alarms for preset $presetId")
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling preset alarm", e)
        }
    }

    /**
     * Activate a preset immediately (used when we're already in the schedule window)
     */
    private fun activatePresetNow(context: Context, presetId: String) {
        val intent = Intent(context, ScheduledPresetReceiver::class.java).apply {
            action = ScheduledPresetReceiver.ACTION_ACTIVATE_PRESET
            putExtra(ScheduledPresetReceiver.EXTRA_PRESET_ID, presetId)
        }
        context.sendBroadcast(intent)
    }

    private fun parseIsoDate(isoDate: String): Long {
        // Try multiple ISO date formats
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",      // 2026-01-18T00:09:00.000Z
            "yyyy-MM-dd'T'HH:mm:ss'Z'",           // 2026-01-18T00:09:00Z
            "yyyy-MM-dd'T'HH:mm:ssXXX",           // 2026-01-18T00:09:00+00:00
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",       // 2026-01-18T00:09:00.000+00:00
            "yyyy-MM-dd'T'HH:mm:ssZ",             // 2026-01-18T00:09:00+0000
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ"          // 2026-01-18T00:09:00.000+0000
        )

        for (format in formats) {
            try {
                val sdf = java.text.SimpleDateFormat(format, java.util.Locale.US)
                sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
                val result = sdf.parse(isoDate)?.time
                if (result != null) {
                    return result
                }
            } catch (e: Exception) {
                // Try next format
            }
        }

        Log.e(TAG, "Failed to parse date with any format: $isoDate")
        return System.currentTimeMillis()
    }
}
