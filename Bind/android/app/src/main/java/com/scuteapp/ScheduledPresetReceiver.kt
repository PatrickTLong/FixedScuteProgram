package com.scuteapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import kotlin.concurrent.thread

/**
 * BroadcastReceiver that handles scheduled preset alarms.
 * When an alarm fires, this receiver checks if the preset should be activated.
 */
class ScheduledPresetReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "ScheduledPresetReceiver"
        const val ACTION_ACTIVATE_PRESET = "com.scuteapp.ACTION_ACTIVATE_PRESET"
        const val ACTION_END_PRESET = "com.scuteapp.ACTION_END_PRESET"
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

            // Notify React Native that a session ended
            SessionEventHelper.emitSessionEvent(context, "session_ended")

            // Check if this is a recurring preset and handle it
            Log.d(TAG, "[DEACTIVATE] Checking if preset is recurring...")
            val prefs = context.getSharedPreferences(ScheduleManager.PREFS_NAME, Context.MODE_PRIVATE)
            val presetsJson = prefs.getString(ScheduleManager.KEY_SCHEDULED_PRESETS, null)

            if (presetsJson != null) {
                Log.d(TAG, "[DEACTIVATE] Found scheduled presets JSON, searching for preset $presetId")
                val presetsArray = JSONArray(presetsJson)
                Log.d(TAG, "[DEACTIVATE] Total presets in array: ${presetsArray.length()}")

                for (i in 0 until presetsArray.length()) {
                    val preset = presetsArray.getJSONObject(i)
                    val currentPresetId = preset.getString("id")
                    if (currentPresetId == presetId) {
                        Log.d(TAG, "[DEACTIVATE] Found matching preset at index $i")
                        val repeatEnabled = preset.optBoolean("repeat_enabled", false)
                        val isActive = preset.optBoolean("isActive", false)
                        val repeatUnit = preset.optString("repeat_unit", "hours")
                        val repeatInterval = preset.optInt("repeat_interval", 1)

                        Log.d(TAG, "[DEACTIVATE] Preset recurring settings:")
                        Log.d(TAG, "[DEACTIVATE]   repeat_enabled=$repeatEnabled")
                        Log.d(TAG, "[DEACTIVATE]   isActive=$isActive")
                        Log.d(TAG, "[DEACTIVATE]   repeat_unit=$repeatUnit")
                        Log.d(TAG, "[DEACTIVATE]   repeat_interval=$repeatInterval")

                        if (repeatEnabled && isActive) {
                            // This is a recurring preset that's still toggled on - schedule next occurrence
                            Log.d(TAG, "[DEACTIVATE] *** RECURRING PRESET DETECTED! ***")
                            Log.d(TAG, "[DEACTIVATE] Preset is recurring and still active, will calculate next occurrence")
                            handleRecurringPreset(context, preset, presetsArray, i, prefs)
                            // Don't show deactivation notification for recurring - show "next scheduled" instead
                            showRecurringNotification(context, presetName, preset)
                            Log.d(TAG, "[DEACTIVATE] Recurring preset handled successfully: $presetId")
                            return
                        } else {
                            Log.d(TAG, "[DEACTIVATE] Preset is NOT recurring or is disabled")
                            if (!repeatEnabled) Log.d(TAG, "[DEACTIVATE]   Reason: repeat_enabled is false")
                            if (!isActive) Log.d(TAG, "[DEACTIVATE]   Reason: isActive is false")
                        }
                        break
                    }
                }
            } else {
                Log.d(TAG, "[DEACTIVATE] No scheduled presets JSON found in SharedPreferences")
            }

            // Show high-priority notification that blocking has ended (non-recurring)
            showDeactivationNotification(context, presetName)

            Log.d(TAG, "Scheduled preset deactivated: $presetId")

        } catch (e: Exception) {
            Log.e(TAG, "Error deactivating scheduled preset", e)
        }
    }

    /**
     * Handle recurring preset: calculate next dates, update backend, update local storage, schedule next alarm
     */
    private fun handleRecurringPreset(
        context: Context,
        preset: JSONObject,
        presetsArray: JSONArray,
        presetIndex: Int,
        prefs: android.content.SharedPreferences
    ) {
        val presetId = preset.getString("id")
        val presetName = preset.optString("name", "Unknown")
        Log.d(TAG, "[RECURRING] ========== HANDLING RECURRING PRESET ==========")
        Log.d(TAG, "[RECURRING] Preset ID: $presetId, Name: $presetName")

        val startDateStr = preset.optString("scheduleStartDate", null)
        val endDateStr = preset.optString("scheduleEndDate", null)
        val repeatUnit = preset.optString("repeat_unit", "hours")
        val repeatInterval = preset.optInt("repeat_interval", 1)

        Log.d(TAG, "[RECURRING] Current schedule: start=$startDateStr, end=$endDateStr")
        Log.d(TAG, "[RECURRING] Repeat settings: interval=$repeatInterval, unit=$repeatUnit")

        if (startDateStr == null || endDateStr == null) {
            Log.e(TAG, "[RECURRING] ERROR: Cannot calculate next occurrence - missing dates")
            return
        }

        val startTime = parseIsoDate(startDateStr)
        val endTime = parseIsoDate(endDateStr)
        val duration = endTime - startTime
        Log.d(TAG, "[RECURRING] Parsed times: startTime=$startTime, endTime=$endTime, duration=${duration}ms (${duration / 60000} minutes)")

        // Calculate next occurrence using same logic as PresetEditModal
        Log.d(TAG, "[RECURRING] Calculating next occurrence with unit=$repeatUnit, interval=$repeatInterval")
        val (newStartTime, newEndTime) = when (repeatUnit) {
            "minutes" -> {
                // Add interval to END time to get new START
                val intervalMs = repeatInterval * 60 * 1000L
                val newStart = endTime + intervalMs
                Log.d(TAG, "[RECURRING] Minutes calculation: endTime + ${intervalMs}ms = $newStart")
                Pair(newStart, newStart + duration)
            }
            "hours" -> {
                // Add interval to END time to get new START
                val intervalMs = repeatInterval * 60 * 60 * 1000L
                val newStart = endTime + intervalMs
                Log.d(TAG, "[RECURRING] Hours calculation: endTime + ${intervalMs}ms = $newStart")
                Pair(newStart, newStart + duration)
            }
            "days" -> {
                // Add interval to START date (same time slot)
                val calStart = Calendar.getInstance().apply { timeInMillis = startTime }
                calStart.add(Calendar.DAY_OF_YEAR, repeatInterval)
                val calEnd = Calendar.getInstance().apply { timeInMillis = endTime }
                calEnd.add(Calendar.DAY_OF_YEAR, repeatInterval)
                Log.d(TAG, "[RECURRING] Days calculation: adding $repeatInterval days")
                Pair(calStart.timeInMillis, calEnd.timeInMillis)
            }
            "weeks" -> {
                // Add interval to START date (same time slot)
                val calStart = Calendar.getInstance().apply { timeInMillis = startTime }
                calStart.add(Calendar.WEEK_OF_YEAR, repeatInterval)
                val calEnd = Calendar.getInstance().apply { timeInMillis = endTime }
                calEnd.add(Calendar.WEEK_OF_YEAR, repeatInterval)
                Log.d(TAG, "[RECURRING] Weeks calculation: adding $repeatInterval weeks")
                Pair(calStart.timeInMillis, calEnd.timeInMillis)
            }
            "months" -> {
                // Add interval to START date (same time slot)
                val calStart = Calendar.getInstance().apply { timeInMillis = startTime }
                calStart.add(Calendar.MONTH, repeatInterval)
                val calEnd = Calendar.getInstance().apply { timeInMillis = endTime }
                calEnd.add(Calendar.MONTH, repeatInterval)
                Log.d(TAG, "[RECURRING] Months calculation: adding $repeatInterval months")
                Pair(calStart.timeInMillis, calEnd.timeInMillis)
            }
            else -> {
                Log.e(TAG, "[RECURRING] ERROR: Unknown repeat unit: $repeatUnit")
                return
            }
        }

        val newStartDateStr = formatToIsoDate(newStartTime)
        val newEndDateStr = formatToIsoDate(newEndTime)

        Log.d(TAG, "[RECURRING] New schedule calculated:")
        Log.d(TAG, "[RECURRING]   New start: $newStartDateStr (${java.util.Date(newStartTime)})")
        Log.d(TAG, "[RECURRING]   New end: $newEndDateStr (${java.util.Date(newEndTime)})")

        // Update local preset JSON
        Log.d(TAG, "[RECURRING] Updating local SharedPreferences...")
        preset.put("scheduleStartDate", newStartDateStr)
        preset.put("scheduleEndDate", newEndDateStr)
        presetsArray.put(presetIndex, preset)
        prefs.edit().putString(ScheduleManager.KEY_SCHEDULED_PRESETS, presetsArray.toString()).apply()
        Log.d(TAG, "[RECURRING] Local storage updated successfully")

        // Schedule next alarm
        Log.d(TAG, "[RECURRING] Scheduling next alarm for ${java.util.Date(newStartTime)}...")
        ScheduleManager.schedulePresetStart(context, presetId, newStartTime)
        Log.d(TAG, "[RECURRING] Next alarm scheduled successfully")

        // Update backend in background thread (don't block the main thread)
        Log.d(TAG, "[RECURRING] Starting background thread for backend update...")
        thread {
            updateBackendSchedule(context, presetId, newStartDateStr, newEndDateStr)
        }
        Log.d(TAG, "[RECURRING] ========== RECURRING PRESET HANDLED ==========")
    }

    /**
     * Call backend API to deactivate the current no-time-limit preset and clear lock status.
     * Mirrors the JS logic: activatePreset(email, null) + updateLockStatus(email, false, null)
     */
    private fun deactivateNoTimeLimitPresetBackend(context: Context) {
        thread {
            try {
                val token = getAuthTokenFromAsyncStorage(context)
                if (token == null) {
                    Log.e(TAG, "[BACKEND] No auth token found, cannot deactivate no-time-limit preset in backend")
                    return@thread
                }

                val apiBaseUrl = BuildConfig.API_URL

                // 1. Deactivate the active preset: POST /api/presets/activate { presetId: null }
                try {
                    val activateUrl = URL("$apiBaseUrl/api/presets/activate")
                    val activateConn = activateUrl.openConnection() as HttpURLConnection
                    activateConn.requestMethod = "POST"
                    activateConn.setRequestProperty("Content-Type", "application/json")
                    activateConn.setRequestProperty("Authorization", "Bearer $token")
                    activateConn.doOutput = true
                    activateConn.connectTimeout = 10000
                    activateConn.readTimeout = 10000

                    val activateBody = JSONObject().apply { put("presetId", JSONObject.NULL) }
                    activateConn.outputStream.use { os ->
                        os.write(activateBody.toString().toByteArray(Charsets.UTF_8))
                    }

                    val activateCode = activateConn.responseCode
                    Log.d(TAG, "[BACKEND] Deactivate preset response: $activateCode")
                    activateConn.disconnect()
                } catch (e: Exception) {
                    Log.e(TAG, "[BACKEND] Error deactivating preset", e)
                }

                // 2. Clear lock status: POST /api/lock-status { isLocked: false, lockEndsAt: null }
                try {
                    val lockUrl = URL("$apiBaseUrl/api/lock-status")
                    val lockConn = lockUrl.openConnection() as HttpURLConnection
                    lockConn.requestMethod = "POST"
                    lockConn.setRequestProperty("Content-Type", "application/json")
                    lockConn.setRequestProperty("Authorization", "Bearer $token")
                    lockConn.doOutput = true
                    lockConn.connectTimeout = 10000
                    lockConn.readTimeout = 10000

                    val lockBody = JSONObject().apply {
                        put("isLocked", false)
                        put("lockEndsAt", JSONObject.NULL)
                    }
                    lockConn.outputStream.use { os ->
                        os.write(lockBody.toString().toByteArray(Charsets.UTF_8))
                    }

                    val lockCode = lockConn.responseCode
                    Log.d(TAG, "[BACKEND] Clear lock status response: $lockCode")
                    lockConn.disconnect()
                } catch (e: Exception) {
                    Log.e(TAG, "[BACKEND] Error clearing lock status", e)
                }

            } catch (e: Exception) {
                Log.e(TAG, "[BACKEND] Error in deactivateNoTimeLimitPresetBackend", e)
            }
        }
    }

    /**
     * Call backend API to update the preset's schedule dates
     */
    private fun updateBackendSchedule(
        context: Context,
        presetId: String,
        newStartDate: String,
        newEndDate: String
    ) {
        Log.d(TAG, "[BACKEND] ========== UPDATING BACKEND SCHEDULE ==========")
        Log.d(TAG, "[BACKEND] Preset ID: $presetId")
        Log.d(TAG, "[BACKEND] New start date: $newStartDate")
        Log.d(TAG, "[BACKEND] New end date: $newEndDate")

        try {
            // Get auth token from AsyncStorage SQLite database
            Log.d(TAG, "[BACKEND] Retrieving auth token from AsyncStorage SQLite DB...")
            val token = getAuthTokenFromAsyncStorage(context)

            if (token == null) {
                Log.e(TAG, "[BACKEND] ERROR: No auth token found in AsyncStorage, cannot update backend")
                return
            }
            Log.d(TAG, "[BACKEND] Auth token found (length: ${token.length})")

            // Get API URL from BuildConfig or use default
            val apiUrl = "${BuildConfig.API_URL}/api/presets/update-schedule"
            Log.d(TAG, "[BACKEND] API URL: $apiUrl")

            val url = URL(apiUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val jsonBody = JSONObject().apply {
                put("presetId", presetId)
                put("scheduleStartDate", newStartDate)
                put("scheduleEndDate", newEndDate)
            }
            Log.d(TAG, "[BACKEND] Request body: $jsonBody")

            Log.d(TAG, "[BACKEND] Sending POST request...")
            connection.outputStream.use { os ->
                os.write(jsonBody.toString().toByteArray(Charsets.UTF_8))
            }

            val responseCode = connection.responseCode
            Log.d(TAG, "[BACKEND] Response code: $responseCode")

            if (responseCode == HttpURLConnection.HTTP_OK) {
                val responseBody = connection.inputStream.bufferedReader().readText()
                Log.d(TAG, "[BACKEND] SUCCESS! Response: $responseBody")
                Log.d(TAG, "[BACKEND] Backend schedule updated successfully for preset $presetId")
            } else {
                val errorBody = try {
                    connection.errorStream?.bufferedReader()?.readText() ?: "No error body"
                } catch (e: Exception) {
                    "Could not read error body: ${e.message}"
                }
                Log.e(TAG, "[BACKEND] ERROR: Backend update failed with code $responseCode")
                Log.e(TAG, "[BACKEND] Error response: $errorBody")
            }

            connection.disconnect()
            Log.d(TAG, "[BACKEND] ========== BACKEND UPDATE COMPLETE ==========")
        } catch (e: Exception) {
            Log.e(TAG, "[BACKEND] ERROR: Exception updating backend schedule", e)
            Log.e(TAG, "[BACKEND] Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "[BACKEND] Exception message: ${e.message}")
        }
    }

    /**
     * Show notification that preset has ended but next occurrence is scheduled
     */
    private fun showRecurringNotification(context: Context, presetName: String, preset: JSONObject) {
        Log.d(TAG, "[NOTIFICATION] ========== SHOWING RECURRING NOTIFICATION ==========")
        Log.d(TAG, "[NOTIFICATION] Preset name: $presetName")

        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "[NOTIFICATION] Creating notification channel for Android O+")
                val channel = NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Schedule Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts when scheduled blocking presets activate or end"
                    enableVibration(true)
                    enableLights(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

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

            // Format next start time for display
            val nextStartStr = preset.optString("scheduleStartDate", null)
            Log.d(TAG, "[NOTIFICATION] Next start date string: $nextStartStr")
            val nextStartTime = if (nextStartStr != null) parseIsoDate(nextStartStr) else 0L
            val nextStartFormatted = java.text.SimpleDateFormat("MMM d 'at' h:mm a", java.util.Locale.getDefault())
                .format(java.util.Date(nextStartTime))
            Log.d(TAG, "[NOTIFICATION] Next occurrence formatted: $nextStartFormatted")

            val notificationText = "\"$presetName\" ended. Next: $nextStartFormatted"
            Log.d(TAG, "[NOTIFICATION] Notification text: $notificationText")

            val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
                .setContentTitle("Session Ended")
                .setContentText(notificationText)
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build()

            notificationManager.notify(DEACTIVATION_NOTIFICATION_ID, notification)
            Log.d(TAG, "[NOTIFICATION] Notification posted successfully")

            // Dismiss the floating bubble since session has ended
            // (Don't show bubble for next occurrence - only show when preset is ACTIVE)
            try {
                FloatingBubbleManager.getInstance(context).dismiss()
                Log.d(TAG, "[NOTIFICATION] Dismissed floating bubble for recurring session end")
            } catch (e: Exception) {
                Log.d(TAG, "[NOTIFICATION] Failed to dismiss floating bubble", e)
            }

            Log.d(TAG, "[NOTIFICATION] ========== RECURRING NOTIFICATION COMPLETE ==========")
        } catch (e: Exception) {
            Log.e(TAG, "[NOTIFICATION] ERROR: Failed to show recurring notification", e)
        }
    }

    private fun formatToIsoDate(timeMs: Long): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return sdf.format(java.util.Date(timeMs))
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

                    // Deactivate in backend (runs on background thread)
                    deactivateNoTimeLimitPresetBackend(context)
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
            // Use commit() instead of apply() to ensure prefs are written before service reads them
            sessionPrefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, selectedApps)
                .putStringSet("blocked_websites", blockedWebsites)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, endTime)
                .putLong("session_start_time", System.currentTimeMillis())
                .putBoolean("no_time_limit", noTimeLimit)
                .putString("active_preset_id", presetId)
                .putString("active_preset_name", targetPreset.optString("name", "Scheduled Preset"))
                .putBoolean("is_scheduled_preset", true) // Mark as scheduled so TimerPresetReceiver knows to skip
                .commit()

            // Start the foreground service
            val serviceIntent = Intent(context, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            Log.d(TAG, "Scheduled preset activated: ${targetPreset.optString("name")}")

            // Floating bubble is shown by UninstallBlockerService.onStartCommand
            // Note: No activation notification shown for scheduled presets - the foreground service notification is sufficient

            // Notify React Native that a session started
            SessionEventHelper.emitSessionEvent(context, "session_started")

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

            // Build the notification with high priority (no fullScreenIntent - using floating bubble instead)
            val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
                .setContentTitle("Session Ended")
                .setContentText("\"$presetName\" has ended.")
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound, vibrate, lights
                .build()

            notificationManager.notify(DEACTIVATION_NOTIFICATION_ID, notification)

            // Dismiss the floating bubble since session has ended
            try {
                FloatingBubbleManager.getInstance(context).dismiss()
                Log.d(TAG, "Dismissed floating bubble for session end")
            } catch (e: Exception) {
                Log.d(TAG, "Failed to dismiss floating bubble", e)
            }

            Log.d(TAG, "Showed deactivation notification for preset: $presetName")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to show deactivation notification", e)
        }
    }

    /**
     * Read auth token from React Native AsyncStorage SQLite database
     */
    private fun getAuthTokenFromAsyncStorage(context: Context): String? {
        var db: SQLiteDatabase? = null
        try {
            // AsyncStorage stores data in a SQLite database
            val dbPath = context.getDatabasePath("RKStorage").absolutePath
            Log.d(TAG, "[BACKEND] AsyncStorage DB path: $dbPath")

            val dbFile = java.io.File(dbPath)
            if (!dbFile.exists()) {
                Log.e(TAG, "[BACKEND] AsyncStorage database does not exist")
                return null
            }

            db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery(
                "SELECT value FROM catalystLocalStorage WHERE key = ?",
                arrayOf("@scute_auth_token")
            )

            var token: String? = null
            if (cursor.moveToFirst()) {
                token = cursor.getString(0)
                Log.d(TAG, "[BACKEND] Found auth token in AsyncStorage")
            } else {
                Log.e(TAG, "[BACKEND] No auth token found in AsyncStorage table")
            }
            cursor.close()
            return token
        } catch (e: Exception) {
            Log.e(TAG, "[BACKEND] Error reading from AsyncStorage: ${e.message}", e)
            return null
        } finally {
            db?.close()
        }
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
