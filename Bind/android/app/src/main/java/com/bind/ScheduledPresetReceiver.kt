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
import org.json.JSONObject

/**
 * BroadcastReceiver that handles scheduled preset alarms.
 * When an alarm fires, this receiver checks if the preset should be activated.
 */
class ScheduledPresetReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "ScheduledPresetReceiver"
        const val ACTION_ACTIVATE_PRESET = "com.bind.ACTION_ACTIVATE_PRESET"
        const val ACTION_END_PRESET = "com.bind.ACTION_END_PRESET"
        const val EXTRA_PRESET_ID = "preset_id"

        // Notification channel for schedule alerts (high priority, heads-up)
        private const val ALERT_CHANNEL_ID = "scute_schedule_alerts"
        private const val ACTIVATION_NOTIFICATION_ID = 2001
        private const val DEACTIVATION_NOTIFICATION_ID = 2002
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Received broadcast: ${intent.action}")

        when (intent.action) {
            ACTION_ACTIVATE_PRESET -> {
                val presetId = intent.getStringExtra(EXTRA_PRESET_ID)
                if (presetId != null) {
                    activateScheduledPreset(context, presetId)
                }
            }
            ACTION_END_PRESET -> {
                val presetId = intent.getStringExtra(EXTRA_PRESET_ID)
                if (presetId != null) {
                    deactivateScheduledPreset(context, presetId)
                }
            }
            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule all alarms after device reboot
                ScheduleManager.rescheduleAllPresets(context)
            }
        }
    }

    private fun deactivateScheduledPreset(context: Context, presetId: String) {
        try {
            Log.d(TAG, "Deactivating scheduled preset: $presetId")

            val sessionPrefs = context.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Check if this preset is the currently active one
            val activePresetId = sessionPrefs.getString("active_preset_id", null)
            if (activePresetId != presetId) {
                Log.d(TAG, "Preset $presetId is not the active preset, skipping deactivation")
                return
            }

            // Get the preset name before clearing it
            val presetName = sessionPrefs.getString("active_preset_name", null) ?: "Preset"

            // Check if this is a recurring preset and handle renewal
            val prefs = context.getSharedPreferences(ScheduleManager.PREFS_NAME, Context.MODE_PRIVATE)
            val presetsJson = prefs.getString(ScheduleManager.KEY_SCHEDULED_PRESETS, null)
            var isRecurring = false
            var presetRenewed = false

            if (presetsJson != null) {
                val presetsArray = org.json.JSONArray(presetsJson)
                for (i in 0 until presetsArray.length()) {
                    val preset = presetsArray.getJSONObject(i)
                    if (preset.getString("id") == presetId) {
                        val repeatEnabled = preset.optBoolean("repeat_enabled", false)
                        val repeatUnit = preset.optString("repeat_unit", null)
                        val repeatInterval = preset.optInt("repeat_interval", 0)
                        val startDateStr = preset.optString("scheduleStartDate", null)
                        val endDateStr = preset.optString("scheduleEndDate", null)

                        Log.d(TAG, "RECURRING check: repeat_enabled=$repeatEnabled, unit=$repeatUnit, interval=$repeatInterval")

                        if (repeatEnabled && repeatUnit != null && repeatInterval > 0 && startDateStr != null && endDateStr != null) {
                            isRecurring = true
                            Log.d(TAG, "RECURRING preset detected, calculating next occurrence...")

                            // Calculate next occurrence
                            val startTime = parseIsoDate(startDateStr)
                            val endTime = parseIsoDate(endDateStr)
                            val duration = endTime - startTime

                            val nextStart: Long
                            val nextEnd: Long

                            when (repeatUnit) {
                                "minutes" -> {
                                    val intervalMs = repeatInterval * 60 * 1000L
                                    nextStart = endTime + intervalMs
                                    nextEnd = nextStart + duration
                                }
                                "hours" -> {
                                    val intervalMs = repeatInterval * 60 * 60 * 1000L
                                    nextStart = endTime + intervalMs
                                    nextEnd = nextStart + duration
                                }
                                "days" -> {
                                    val calendar = java.util.Calendar.getInstance()
                                    calendar.timeInMillis = startTime
                                    calendar.add(java.util.Calendar.DAY_OF_MONTH, repeatInterval)
                                    nextStart = calendar.timeInMillis
                                    calendar.timeInMillis = endTime
                                    calendar.add(java.util.Calendar.DAY_OF_MONTH, repeatInterval)
                                    nextEnd = calendar.timeInMillis
                                }
                                "weeks" -> {
                                    val calendar = java.util.Calendar.getInstance()
                                    calendar.timeInMillis = startTime
                                    calendar.add(java.util.Calendar.WEEK_OF_YEAR, repeatInterval)
                                    nextStart = calendar.timeInMillis
                                    calendar.timeInMillis = endTime
                                    calendar.add(java.util.Calendar.WEEK_OF_YEAR, repeatInterval)
                                    nextEnd = calendar.timeInMillis
                                }
                                "months" -> {
                                    val calendar = java.util.Calendar.getInstance()
                                    calendar.timeInMillis = startTime
                                    calendar.add(java.util.Calendar.MONTH, repeatInterval)
                                    nextStart = calendar.timeInMillis
                                    calendar.timeInMillis = endTime
                                    calendar.add(java.util.Calendar.MONTH, repeatInterval)
                                    nextEnd = calendar.timeInMillis
                                }
                                else -> {
                                    nextStart = startTime
                                    nextEnd = endTime
                                }
                            }

                            // Format dates back to ISO string
                            val dateFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                            dateFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")
                            val nextStartStr = dateFormat.format(java.util.Date(nextStart))
                            val nextEndStr = dateFormat.format(java.util.Date(nextEnd))

                            Log.d(TAG, "RECURRING: Next occurrence - start=$nextStartStr, end=$nextEndStr")

                            // Update the preset in the JSON array
                            preset.put("scheduleStartDate", nextStartStr)
                            preset.put("scheduleEndDate", nextEndStr)

                            // Save updated presets back to SharedPreferences
                            prefs.edit()
                                .putString(ScheduleManager.KEY_SCHEDULED_PRESETS, presetsArray.toString())
                                .apply()

                            Log.d(TAG, "RECURRING: Updated preset JSON with new dates")

                            // Schedule the next start alarm
                            ScheduleManager.schedulePresetStart(context, presetId, nextStart)
                            Log.d(TAG, "RECURRING: Scheduled next start alarm at ${java.util.Date(nextStart)}")

                            presetRenewed = true
                        }
                        break
                    }
                }
            }

            // Clear the session
            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .remove("active_preset_id")
                .remove("active_preset_name")
                .remove("is_scheduled_preset")
                .apply()

            // Stop the foreground service
            val serviceIntent = Intent(context, UninstallBlockerService::class.java)
            context.stopService(serviceIntent)

            // Show notification - different message for recurring vs non-recurring
            if (isRecurring && presetRenewed) {
                // Store launch data so React Native can detect this and sync to backend
                val launchPrefs = context.getSharedPreferences("scute_launch_prefs", Context.MODE_PRIVATE)
                launchPrefs.edit()
                    .putBoolean("recurring_preset_paused", true)
                    .putLong("recurring_launch_time", System.currentTimeMillis())
                    .apply()
                Log.d(TAG, "Stored recurring preset pause launch data")

                showRecurringPausedNotification(context, presetName)
            } else {
                showDeactivationNotification(context, presetName)
            }

            Log.d(TAG, "Scheduled preset deactivated: $presetId (recurring=$isRecurring, renewed=$presetRenewed)")

        } catch (e: Exception) {
            Log.e(TAG, "Error deactivating scheduled preset", e)
        }
    }

    /**
     * Show notification when a recurring preset pauses until next occurrence.
     */
    private fun showRecurringPausedNotification(context: Context, presetName: String) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Create the high-priority notification channel (Android 8+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Schedule Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts when scheduled blocking presets activate or end"
                    enableVibration(true)
                    enableLights(true)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            // Create intent to open the app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("recurring_preset_paused", true)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                DEACTIVATION_NOTIFICATION_ID + 2000,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Create full screen intent for launching app
            val fullScreenIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                putExtra("recurring_preset_paused", true)
            }
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                DEACTIVATION_NOTIFICATION_ID + 3000,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
                .setContentTitle("Recurring Block Paused")
                .setContentText("\"$presetName\" will resume at the next scheduled time.")
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build()

            notificationManager.notify(DEACTIVATION_NOTIFICATION_ID, notification)

            // Also try direct launch
            try {
                val appLaunchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (appLaunchIntent != null) {
                    appLaunchIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    )
                    appLaunchIntent.putExtra("recurring_preset_paused", true)
                    context.startActivity(appLaunchIntent)
                    Log.d(TAG, "Launched app for recurring preset pause via direct startActivity")
                }
            } catch (e: Exception) {
                Log.d(TAG, "Direct startActivity failed, fullScreenIntent will handle it", e)
            }

            Log.d(TAG, "Showed recurring paused notification for preset: $presetName")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show recurring paused notification", e)
        }
    }

    private fun activateScheduledPreset(context: Context, presetId: String) {
        try {
            Log.d(TAG, "Activating scheduled preset: $presetId")

            // Check if this preset is already active to avoid duplicate activations
            val sessionPrefs = context.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val currentActiveId = sessionPrefs.getString("active_preset_id", null)
            val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)

            if (isSessionActive && currentActiveId == presetId) {
                Log.d(TAG, "Preset $presetId is already active, skipping duplicate activation")
                return
            }

            // Check if a no-time-limit preset is currently active - if so, cancel it so scheduled can take over
            if (isSessionActive) {
                val isNoTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)
                val isScheduledPreset = sessionPrefs.getBoolean("is_scheduled_preset", false)

                if (isNoTimeLimit && !isScheduledPreset) {
                    // A no-time-limit manual preset is active - cancel it to let scheduled preset activate
                    Log.d(TAG, "Cancelling active no-time-limit preset to activate scheduled preset $presetId")

                    // Stop the current session
                    sessionPrefs.edit()
                        .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                        .remove("active_preset_id")
                        .remove("active_preset_name")
                        .remove("no_time_limit")
                        .apply()

                    // Stop the foreground service briefly
                    val stopServiceIntent = Intent(context, UninstallBlockerService::class.java)
                    context.stopService(stopServiceIntent)
                }
            }

            val prefs = context.getSharedPreferences(ScheduleManager.PREFS_NAME, Context.MODE_PRIVATE)
            val presetsJson = prefs.getString(ScheduleManager.KEY_SCHEDULED_PRESETS, null)

            if (presetsJson == null) {
                Log.w(TAG, "No scheduled presets found")
                return
            }

            val presetsArray = org.json.JSONArray(presetsJson)
            var targetPreset: JSONObject? = null

            for (i in 0 until presetsArray.length()) {
                val preset = presetsArray.getJSONObject(i)
                if (preset.getString("id") == presetId) {
                    targetPreset = preset
                    break
                }
            }

            if (targetPreset == null) {
                Log.w(TAG, "Preset not found: $presetId")
                return
            }

            // Check if preset is still active (toggled on)
            if (!targetPreset.optBoolean("isActive", false)) {
                Log.d(TAG, "Preset is not active, skipping activation")
                return
            }

            // Check if we're within the schedule window
            val now = System.currentTimeMillis()
            val startDate = targetPreset.optString("scheduleStartDate", null)
            val endDate = targetPreset.optString("scheduleEndDate", null)

            if (startDate != null && endDate != null) {
                val startTime = parseIsoDate(startDate)
                val endTime = parseIsoDate(endDate)

                if (now < startTime || now >= endTime) {
                    Log.d(TAG, "Current time is outside schedule window")
                    return
                }
            }

            // Extract preset config
            val mode = targetPreset.optString("mode", "specific")
            val selectedApps = mutableSetOf<String>()
            val blockedWebsites = mutableSetOf<String>()

            val appsArray = targetPreset.optJSONArray("selectedApps")
            if (appsArray != null) {
                for (i in 0 until appsArray.length()) {
                    selectedApps.add(appsArray.getString(i))
                }
            }

            // Handle "all" mode - get all installed apps to block
            if (mode == "all") {
                try {
                    val pm = context.packageManager
                    val mainIntent = android.content.Intent(android.content.Intent.ACTION_MAIN, null)
                    mainIntent.addCategory(android.content.Intent.CATEGORY_LAUNCHER)
                    val resolvedInfos = pm.queryIntentActivities(mainIntent, 0)

                    for (resolveInfo in resolvedInfos) {
                        val packageName = resolveInfo.activityInfo.packageName
                        // Skip our own app
                        if (packageName != context.packageName) {
                            selectedApps.add(packageName)
                        }
                    }
                    Log.d(TAG, "Mode 'all': blocking ${selectedApps.size} apps")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to get installed apps for 'all' mode", e)
                }
            }

            val websitesArray = targetPreset.optJSONArray("blockedWebsites")
            if (websitesArray != null) {
                for (i in 0 until websitesArray.length()) {
                    blockedWebsites.add(websitesArray.getString(i))
                }
            }

            val blockSettings = targetPreset.optBoolean("blockSettings", false)
            if (blockSettings) {
                // Add all known system settings packages for different device manufacturers
                selectedApps.add("com.android.settings")
                selectedApps.add("com.samsung.android.settings")
                selectedApps.add("com.miui.securitycenter")
                selectedApps.add("com.coloros.settings")
                selectedApps.add("com.oppo.settings")
                selectedApps.add("com.vivo.settings")
                selectedApps.add("com.huawei.systemmanager")
                selectedApps.add("com.oneplus.settings")
                selectedApps.add("com.google.android.settings.intelligence")
            }

            // Calculate end time
            val noTimeLimit = targetPreset.optBoolean("noTimeLimit", false)
            val endTime = if (endDate != null && !noTimeLimit) {
                parseIsoDate(endDate)
            } else {
                System.currentTimeMillis() + Long.MAX_VALUE / 2
            }

            // Save to session prefs (reusing sessionPrefs from earlier check)
            sessionPrefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, selectedApps)
                .putStringSet("blocked_websites", blockedWebsites)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, endTime)
                .putBoolean("no_time_limit", noTimeLimit)
                .putString("active_preset_id", presetId)
                .putString("active_preset_name", targetPreset.optString("name", "Scheduled Preset"))
                .putBoolean("is_scheduled_preset", true) // Mark as scheduled so TimerPresetReceiver knows to skip
                .apply()

            // Start the foreground service
            val serviceIntent = Intent(context, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            Log.d(TAG, "Scheduled preset activated: ${targetPreset.optString("name")}")

            // Show a high-priority notification to alert the user
            showActivationNotification(
                context,
                targetPreset.optString("name", "Scheduled Preset"),
                presetId
            )

            // Launch the app and bring it to foreground (locked home screen)
            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    launchIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    )
                    // Pass extra to indicate this was launched from a scheduled preset alarm
                    launchIntent.putExtra("scheduled_preset_activated", true)
                    launchIntent.putExtra("preset_id", presetId)
                    launchIntent.putExtra("preset_name", targetPreset.optString("name", "Scheduled Preset"))
                    context.startActivity(launchIntent)
                    Log.d(TAG, "Launched app to locked home screen for preset: ${targetPreset.optString("name")}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch app", e)
            }

            // Schedule the end alarm to stop blocking
            if (endDate != null && !noTimeLimit) {
                ScheduleManager.schedulePresetEnd(context, presetId, parseIsoDate(endDate))
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error activating scheduled preset", e)
        }
    }

    /**
     * Show a high-priority heads-up notification when a scheduled preset activates.
     * This ensures the user is notified even when the phone was off or the screen is locked.
     */
    private fun showActivationNotification(context: Context, presetName: String, presetId: String) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Create the high-priority notification channel (Android 8+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Schedule Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts when scheduled blocking presets activate"
                    enableVibration(true)
                    enableLights(true)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            // Create intent to open the app when notification is tapped
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("scheduled_preset_activated", true)
                putExtra("preset_id", presetId)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                ACTIVATION_NOTIFICATION_ID,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Build the notification with high priority for heads-up display
            val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
                .setContentTitle("Scheduled Blocking Active")
                .setContentText("\"$presetName\" has started. Your apps are now blocked.")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound, vibrate, lights
                .build()

            notificationManager.notify(ACTIVATION_NOTIFICATION_ID, notification)
            Log.d(TAG, "Showed activation notification for preset: $presetName")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show activation notification", e)
        }
    }

    /**
     * Show a high-priority heads-up notification when a preset ends/times out.
     * This ensures the user knows they're unlocked even if they're away from their phone.
     * Uses fullScreenIntent to auto-launch the app (same as TimerPresetReceiver).
     */
    private fun showDeactivationNotification(context: Context, presetName: String) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Create the high-priority notification channel (Android 8+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Schedule Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts when scheduled blocking presets activate or end"
                    enableVibration(true)
                    enableLights(true)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            // Create intent to open the app when notification is tapped
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("scheduled_preset_ended", true)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                DEACTIVATION_NOTIFICATION_ID,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Create a full-screen intent for launching the app from background
            // This is the key to making the app launch even when killed (same as TimerPresetReceiver)
            val fullScreenIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                putExtra("scheduled_preset_ended", true)
            }
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                DEACTIVATION_NOTIFICATION_ID + 1000, // Different request code
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

            notificationManager.notify(DEACTIVATION_NOTIFICATION_ID, notification)

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
                    appLaunchIntent.putExtra("scheduled_preset_ended", true)
                    context.startActivity(appLaunchIntent)
                    Log.d(TAG, "Launched app for scheduled preset end via direct startActivity")
                }
            } catch (e: Exception) {
                Log.d(TAG, "Direct startActivity failed (expected on Android 10+), fullScreenIntent will handle it", e)
            }

            Log.d(TAG, "Showed deactivation notification for preset: $presetName")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show deactivation notification", e)
        }
    }

    private fun parseIsoDate(isoDate: String): Long {
        return try {
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.parse(isoDate)?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            try {
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).apply {
                    timeZone = java.util.TimeZone.getTimeZone("UTC")
                }.parse(isoDate)?.time ?: System.currentTimeMillis()
            } catch (e2: Exception) {
                Log.e(TAG, "Failed to parse date: $isoDate", e2)
                System.currentTimeMillis()
            }
        }
    }
}
