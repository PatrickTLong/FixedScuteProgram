package com.scuteapp

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableArray

/**
 * Native module for starting/stopping blocking sessions from React Native.
 */
class BlockingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BlockingModule"
    }

    override fun getName(): String = "BlockingModule"

    /**
     * Start a blocking session with the given config
     */
    @ReactMethod
    fun startBlocking(config: ReadableMap, promise: Promise) {
        try {
            Log.d(TAG, "startBlocking called with config")

            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Get blocked apps from config
            val appSet = mutableSetOf<String>()
            val selectedApps = config.getArray("selectedApps")
            if (selectedApps != null) {
                for (i in 0 until selectedApps.size()) {
                    selectedApps.getString(i)?.let { appSet.add(it) }
                }
            }

            val mode = config.getString("mode") ?: "specific"
            Log.d(TAG, "Mode: $mode, selectedApps count: ${appSet.size}")

            // Get blocked websites
            val websiteSet = mutableSetOf<String>()
            val blockedWebsites = config.getArray("blockedWebsites")
            if (blockedWebsites != null) {
                for (i in 0 until blockedWebsites.size()) {
                    blockedWebsites.getString(i)?.let { websiteSet.add(it) }
                }
            }

            // Check if settings should be blocked
            val blockSettings = config.getBoolean("blockSettings")
            if (blockSettings) {
                // Add all known system settings packages for different device manufacturers
                appSet.add("com.android.settings")
                appSet.add("com.samsung.android.settings")
                appSet.add("com.samsung.android.setting.multisoundmain")
                appSet.add("com.miui.securitycenter")
                appSet.add("com.coloros.settings")
                appSet.add("com.oppo.settings")
                appSet.add("com.vivo.settings")
                appSet.add("com.huawei.systemmanager")
                appSet.add("com.oneplus.settings")
                appSet.add("com.google.android.settings.intelligence")
                appSet.add("com.android.provision")
                appSet.add("com.lge.settings")
                appSet.add("com.asus.settings")
                appSet.add("com.sony.settings")
            }

            // Calculate end time
            val noTimeLimit = config.getBoolean("noTimeLimit")
            val timerDays = if (config.hasKey("timerDays")) config.getInt("timerDays") else 0
            val timerHours = if (config.hasKey("timerHours")) config.getInt("timerHours") else 0
            val timerMinutes = if (config.hasKey("timerMinutes")) config.getInt("timerMinutes") else 0

            // Check if JS passed the exact end time (handles target dates, timerSeconds, etc.)
            val lockEndTimeMs = if (config.hasKey("lockEndTimeMs")) config.getDouble("lockEndTimeMs").toLong() else 0L

            val durationMs = (timerDays * 24 * 60 * 60 * 1000L) +
                           (timerHours * 60 * 60 * 1000L) +
                           (timerMinutes * 60 * 1000L)

            // Use lockEndTimeMs if provided, otherwise calculate from duration
            val endTime = when {
                noTimeLimit -> System.currentTimeMillis() + Long.MAX_VALUE / 2
                lockEndTimeMs > 0 -> lockEndTimeMs  // Use exact end time from JS
                durationMs > 0 -> System.currentTimeMillis() + durationMs
                else -> System.currentTimeMillis() + Long.MAX_VALUE / 2
            }

            // Check if we have a valid time limit (either from JS or calculated)
            val hasTimeLimit = !noTimeLimit && (lockEndTimeMs > 0 || durationMs > 0)

            // Get preset name and id if provided
            val presetName = if (config.hasKey("presetName")) config.getString("presetName") else "Preset"
            val presetId = if (config.hasKey("presetId")) config.getString("presetId") else null

            // Get strict mode setting (default to true for safety)
            val strictMode = if (config.hasKey("strictMode")) config.getBoolean("strictMode") else true

            // Save to SharedPreferences
            val sessionStartTime = System.currentTimeMillis()
            sessionPrefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, appSet)
                .putStringSet("blocked_websites", websiteSet)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, endTime)
                .putLong("session_start_time", sessionStartTime)
                .putBoolean("no_time_limit", noTimeLimit)
                .putBoolean("strict_mode", strictMode)
                .putString("active_preset_name", presetName)
                .putString("active_preset_id", presetId)
                .apply()

            // Start the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }

            // Schedule timer end alarm for non-scheduled, time-limited presets
            // This ensures notification works even when app is closed or phone is off
            val isScheduled = if (config.hasKey("isScheduled")) config.getBoolean("isScheduled") else false
            if (hasTimeLimit && !isScheduled) {
                TimerAlarmManager.scheduleTimerEnd(reactApplicationContext, endTime, presetId, presetName ?: "Timer")
                Log.d(TAG, "Scheduled timer end alarm for ${java.util.Date(endTime)}")

                // Show floating bubble with countdown timer
                try {
                    FloatingBubbleManager.getInstance(reactApplicationContext).show(endTime)
                    Log.d(TAG, "Showing floating bubble for timer preset")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to show floating bubble", e)
                }
            } else if (noTimeLimit && !isScheduled) {
                // Show floating bubble for no-time-limit presets (counts up elapsed time)
                try {
                    FloatingBubbleManager.getInstance(reactApplicationContext).showNoTimeLimit(sessionStartTime)
                    Log.d(TAG, "Showing floating bubble for no-time-limit preset")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to show floating bubble for no-time-limit", e)
                }
            } else {
                Log.d(TAG, "Skipping timer alarm: hasTimeLimit=$hasTimeLimit, isScheduled=$isScheduled")
            }

            Log.d(TAG, "Blocking started: ${appSet.size} apps, ${websiteSet.size} websites, noTimeLimit: $noTimeLimit")
            Log.d(TAG, "DEBUG - Blocked apps list: $appSet")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting blocking", e)
            promise.reject("ERROR", "Failed to start blocking: ${e.message}")
        }
    }

    /**
     * Stop the current blocking session
     */
    @ReactMethod
    fun stopBlocking(promise: Promise) {
        try {
            Log.d(TAG, "stopBlocking called")

            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                .putStringSet("blocked_websites", emptySet())
                .apply()

            // Cancel any pending timer alarm
            TimerAlarmManager.cancelTimerAlarm(reactApplicationContext)

            // Dismiss floating bubble if showing
            try {
                FloatingBubbleManager.getInstance(reactApplicationContext).dismiss()
            } catch (e: Exception) {
                Log.d(TAG, "Failed to dismiss floating bubble", e)
            }

            // Stop the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            Log.d(TAG, "Blocking stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping blocking", e)
            promise.reject("ERROR", "Failed to stop blocking: ${e.message}")
        }
    }

    /**
     * Stop the current blocking session and show "Session Ended" notification.
     * Called when a timer-based session expires.
     * This clears blocking but user still needs to tap Scute to fully unlock in the UI.
     */
    @ReactMethod
    fun stopBlockingWithNotification(promise: Promise) {
        try {
            Log.d(TAG, "stopBlockingWithNotification called")

            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Get the preset name before clearing the session
            val presetName = sessionPrefs.getString("active_preset_name", null)

            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                .putStringSet("blocked_websites", emptySet())
                .apply()

            // Cancel any pending timer alarm
            TimerAlarmManager.cancelTimerAlarm(reactApplicationContext)

            // Dismiss floating bubble if showing
            try {
                FloatingBubbleManager.getInstance(reactApplicationContext).dismiss()
            } catch (e: Exception) {
                Log.d(TAG, "Failed to dismiss floating bubble", e)
            }

            // Stop the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            // Show the "Session Ended" notification
            UninstallBlockerService.showSessionEndedNotification(reactApplicationContext, presetName)

            Log.d(TAG, "Blocking stopped with notification for: $presetName")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping blocking with notification", e)
            promise.reject("ERROR", "Failed to stop blocking: ${e.message}")
        }
    }

    /**
     * Show "Session Ended" notification without stopping blocking.
     * Used when timer expires but user still needs to tap Scute to unlock.
     */
    @ReactMethod
    fun showSessionEndedNotification(promise: Promise) {
        try {
            Log.d(TAG, "showSessionEndedNotification called")

            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val presetName = sessionPrefs.getString("active_preset_name", null)

            // Just show the notification - don't stop blocking
            UninstallBlockerService.showSessionEndedNotification(reactApplicationContext, presetName)

            Log.d(TAG, "Showed session ended notification for: $presetName")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error showing session ended notification", e)
            promise.reject("ERROR", "Failed to show notification: ${e.message}")
        }
    }

    /**
     * Check if a blocking session is currently active
     */
    @ReactMethod
    fun isBlocking(promise: Promise) {
        try {
            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val endTime = sessionPrefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val isSessionValid = isActive && System.currentTimeMillis() <= endTime

            promise.resolve(isSessionValid)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking blocking status", e)
            promise.reject("ERROR", "Failed to check blocking status: ${e.message}")
        }
    }

    /**
     * Get remaining time in the blocking session (milliseconds)
     */
    @ReactMethod
    fun getRemainingTime(promise: Promise) {
        try {
            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val endTime = sessionPrefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val noTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)

            if (!isActive) {
                promise.resolve(0.0)
                return
            }

            if (noTimeLimit) {
                promise.resolve(-1.0) // -1 indicates no time limit
                return
            }

            val remaining = endTime - System.currentTimeMillis()
            promise.resolve(remaining.toDouble().coerceAtLeast(0.0))
        } catch (e: Exception) {
            Log.e(TAG, "Error getting remaining time", e)
            promise.reject("ERROR", "Failed to get remaining time: ${e.message}")
        }
    }

    /**
     * Force unlock - clears native SharedPreferences and stops blocking service.
     * This bypasses the timer check - use for testing/debug or when DB says unlocked.
     */
    @ReactMethod
    fun forceUnlock(promise: Promise) {
        try {
            Log.d(TAG, "forceUnlock called - clearing native session")

            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Get the active preset ID before clearing (needed to deactivate in ScheduleManager)
            val activePresetId = sessionPrefs.getString("active_preset_id", null)

            // Clear all session data (same as MainActivity.stopSession)
            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                .putStringSet("blocked_websites", emptySet())
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
                .putBoolean("no_time_limit", false)
                .remove("active_preset_id")
                .remove("active_preset_name")
                .remove("is_scheduled_preset")
                .apply()

            // Cancel any pending timer alarm
            TimerAlarmManager.cancelTimerAlarm(reactApplicationContext)

            // If there was an active preset, deactivate it in ScheduleManager to prevent re-activation
            if (activePresetId != null) {
                deactivatePresetInScheduleManager(activePresetId)
            }

            // Dismiss the floating bubble
            FloatingBubbleManager.getInstance(reactApplicationContext).dismiss()

            // Stop the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            Log.d(TAG, "Force unlock complete - native session cleared")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error in forceUnlock", e)
            promise.reject("ERROR", "Failed to force unlock: ${e.message}")
        }
    }

    /**
     * Deactivate a preset in ScheduleManager's local storage.
     * This prevents scheduled presets from re-activating after emergency tapout.
     */
    private fun deactivatePresetInScheduleManager(presetId: String) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                ScheduleManager.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val presetsJson = prefs.getString(ScheduleManager.KEY_SCHEDULED_PRESETS, null)

            if (presetsJson == null) {
                Log.d(TAG, "No scheduled presets to deactivate")
                return
            }

            val presetsArray = org.json.JSONArray(presetsJson)
            var modified = false

            for (i in 0 until presetsArray.length()) {
                val preset = presetsArray.getJSONObject(i)
                if (preset.getString("id") == presetId) {
                    preset.put("isActive", false)
                    modified = true
                    Log.d(TAG, "Deactivated preset $presetId in ScheduleManager")
                    break
                }
            }

            if (modified) {
                prefs.edit().putString(ScheduleManager.KEY_SCHEDULED_PRESETS, presetsArray.toString()).apply()
                // Cancel any pending alarms for this preset
                ScheduleManager.cancelPresetAlarm(reactApplicationContext, presetId)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error deactivating preset in ScheduleManager", e)
        }
    }
}
