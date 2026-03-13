package com.scuteapp

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

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
            Log.d(TAG, "[START-BLOCKING] ========== startBlocking called ==========")

            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Log current session state before overwriting
            val prevActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val prevPresetName = sessionPrefs.getString("active_preset_name", null)
            val prevPresetId = sessionPrefs.getString("active_preset_id", null)
            val prevNoTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)
            Log.d(TAG, "[START-BLOCKING] Previous session state: active=$prevActive, preset=\"$prevPresetName\" (id: $prevPresetId), noTimeLimit=$prevNoTimeLimit")

            // Get blocked apps from config
            val appSet = mutableSetOf<String>()
            val selectedApps = config.getArray("selectedApps")
            if (selectedApps != null) {
                for (i in 0 until selectedApps.size()) {
                    selectedApps.getString(i)?.let { appSet.add(it) }
                }
            }

            val mode = config.getString("mode") ?: "specific"
            Log.d(TAG, "[START-BLOCKING] Mode: $mode, selectedApps count: ${appSet.size}")

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
            Log.d(TAG, "[START-BLOCKING] blockSettings=$blockSettings")
            if (blockSettings) {
                Log.d(TAG, "[START-BLOCKING] Settings blocking enabled — adding settings packages")
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

            // Get custom blocked text (replaces default "X is blocked." overlay message)
            val customBlockedText = if (config.hasKey("customBlockedText")) config.getString("customBlockedText") else ""
            val customOverlayImage = if (config.hasKey("customOverlayImage")) config.getString("customOverlayImage") else ""
            val customRedirectUrl = if (config.hasKey("customRedirectUrl")) config.getString("customRedirectUrl") else ""
            val skipOverlay = if (config.hasKey("skipOverlay")) config.getBoolean("skipOverlay") else false
            val alertNotifyEnabled = if (config.hasKey("alertNotifyEnabled")) config.getBoolean("alertNotifyEnabled") else false
            val alertEmail = if (config.hasKey("alertEmail")) config.getString("alertEmail") ?: "" else ""
            val alertPhone = if (config.hasKey("alertPhone")) config.getString("alertPhone") ?: "" else ""
            val authToken = if (config.hasKey("authToken")) config.getString("authToken") ?: "" else ""
            val apiUrl = if (config.hasKey("apiUrl")) config.getString("apiUrl") ?: "" else ""

            Log.d(TAG, "[START-BLOCKING] Config: presetName=\"$presetName\", presetId=$presetId, noTimeLimit=$noTimeLimit, strictMode=$strictMode, skipOverlay=$skipOverlay")
            Log.d(TAG, "[START-BLOCKING] Timing: endTime=$endTime (${java.util.Date(endTime)}), hasTimeLimit=$hasTimeLimit")
            Log.d(TAG, "[START-BLOCKING] Blocking: apps=${appSet.size}, websites=${websiteSet.size}, customText='$customBlockedText', customImage='$customOverlayImage'")
            Log.d(TAG, "[START-BLOCKING] Redirect: customRedirectUrl='$customRedirectUrl'")

            // Clean up legacy overlay SharedPrefs keys from old versions
            val legacyKeys = listOf(
                "dismiss_text_size", "icon_visible", "custom_dismiss_color",
                "blocked_text_pos_y", "blocked_text_pos_x", "blocked_text_visible",
                "blocked_text_size", "dismiss_text_visible", "custom_overlay_image_size",
                "custom_dismiss_text", "icon_pos_x", "icon_pos_y",
                "dismiss_text_pos_x", "dismiss_text_pos_y", "custom_overlay_bg_color",
                "custom_blocked_text_color"
            )
            val editor = sessionPrefs.edit()
            for (key in legacyKeys) {
                editor.remove(key)
            }
            editor.apply()

            // Save to SharedPreferences
            val isScheduled = if (config.hasKey("isScheduled")) config.getBoolean("isScheduled") else false
            val sessionStartTime = System.currentTimeMillis()
            Log.d(TAG, "[START-BLOCKING] Saving session to SharedPreferences (sessionStartTime=$sessionStartTime, isScheduled=$isScheduled)...")
            sessionPrefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, appSet)
                .putStringSet("blocked_websites", websiteSet)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, endTime)
                .putLong("session_start_time", sessionStartTime)
                .putBoolean("no_time_limit", noTimeLimit)
                .putBoolean("strict_mode", strictMode)
                .putBoolean("is_scheduled_preset", isScheduled)
                .putString("active_preset_name", presetName)
                .putString("active_preset_id", presetId)
                .putString("custom_blocked_text", customBlockedText)
                .putString("custom_overlay_image", customOverlayImage)
                .putString("custom_redirect_url", customRedirectUrl)
                .putBoolean("skip_overlay", skipOverlay)
                .putBoolean("alert_notify_enabled", alertNotifyEnabled)
                .putString("alert_email", alertEmail)
                .putString("alert_phone", alertPhone)
                .putString("auth_token", authToken)
                .putString("api_url", apiUrl)
                .apply()

            Log.d(TAG, "[START-BLOCKING] SharedPreferences saved — noTimeLimit=$noTimeLimit, isScheduled=$isScheduled, presetName=\"$presetName\", presetId=$presetId, customRedirectUrl='$customRedirectUrl'")

            // Start the foreground service
            Log.d(TAG, "[START-BLOCKING] Starting foreground service (bubble will be shown by onStartCommand)...")
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
            Log.d(TAG, "[START-BLOCKING] Foreground service start requested")
            if (hasTimeLimit && !isScheduled) {
                TimerAlarmManager.scheduleTimerEnd(reactApplicationContext, endTime, presetId, presetName ?: "Timer")
                Log.d(TAG, "[START-BLOCKING] Timer end alarm scheduled for ${java.util.Date(endTime)}")
            } else {
                Log.d(TAG, "[START-BLOCKING] Skipping timer alarm: hasTimeLimit=$hasTimeLimit, isScheduled=$isScheduled")
            }

            Log.d(TAG, "[START-BLOCKING] ========== BLOCKING STARTED: \"$presetName\" (noTimeLimit=$noTimeLimit, apps=${appSet.size}, websites=${websiteSet.size}) ==========")
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
            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val activePresetName = sessionPrefs.getString("active_preset_name", null)
            val activePresetId = sessionPrefs.getString("active_preset_id", null)
            val wasNoTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)
            Log.d(TAG, "[STOP-BLOCKING] stopBlocking called — clearing preset \"$activePresetName\" (id: $activePresetId, noTimeLimit: $wasNoTimeLimit)")

            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                .putStringSet("blocked_websites", emptySet())
                .apply()

            // Cancel any pending timer alarm
            TimerAlarmManager.cancelTimerAlarm(reactApplicationContext)

            // Dismiss floating bubble if showing
            val bubbleManager = FloatingBubbleManager.getInstance(reactApplicationContext)
            Log.d(TAG, "[STOP-BLOCKING] Dismissing bubble (showing: ${bubbleManager.isShowing()})")
            try {
                bubbleManager.dismiss()
            } catch (e: Exception) {
                Log.d(TAG, "[STOP-BLOCKING] Failed to dismiss floating bubble", e)
            }

            // Stop the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            Log.d(TAG, "[STOP-BLOCKING] Complete — preset \"$activePresetName\" stopped")
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
            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Get the preset info before clearing the session
            val presetName = sessionPrefs.getString("active_preset_name", null)
            val presetId = sessionPrefs.getString("active_preset_id", null)
            val wasNoTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)
            Log.d(TAG, "[STOP-WITH-NOTIF] stopBlockingWithNotification called — preset \"$presetName\" (id: $presetId, noTimeLimit: $wasNoTimeLimit)")

            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                .putStringSet("blocked_websites", emptySet())
                .apply()

            // Cancel any pending timer alarm
            TimerAlarmManager.cancelTimerAlarm(reactApplicationContext)

            // Dismiss floating bubble if showing
            val bubbleManager = FloatingBubbleManager.getInstance(reactApplicationContext)
            Log.d(TAG, "[STOP-WITH-NOTIF] Dismissing bubble (showing: ${bubbleManager.isShowing()})")
            try {
                bubbleManager.dismiss()
            } catch (e: Exception) {
                Log.d(TAG, "[STOP-WITH-NOTIF] Failed to dismiss floating bubble", e)
            }

            // Stop the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            // Show the "Session Ended" notification
            UninstallBlockerService.showSessionEndedNotification(reactApplicationContext, presetName)

            Log.d(TAG, "[STOP-WITH-NOTIF] Complete — preset \"$presetName\" stopped, notification shown")
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
     * Get full session info from SharedPreferences.
     * Returns { isBlocking, startTime (ISO), endTime (ISO or null), noTimeLimit } so the
     * JS side can restore sharedLockStatus after an app kill without hitting the backend.
     */
    @ReactMethod
    fun getSessionInfo(promise: Promise) {
        try {
            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val endTime = sessionPrefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val startTime = sessionPrefs.getLong("session_start_time", 0)
            val noTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)

            val isSessionValid = isActive && (noTimeLimit || System.currentTimeMillis() <= endTime)

            val map: WritableMap = Arguments.createMap()
            map.putBoolean("isBlocking", isSessionValid)

            if (isSessionValid && startTime > 0) {
                map.putString("lockStartedAt", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.format(java.util.Date(startTime)))
            } else {
                map.putNull("lockStartedAt")
            }

            if (isSessionValid && !noTimeLimit && endTime > 0) {
                map.putString("lockEndsAt", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.format(java.util.Date(endTime)))
            } else {
                map.putNull("lockEndsAt")
            }

            map.putBoolean("noTimeLimit", noTimeLimit && isSessionValid)

            val activePresetId = sessionPrefs.getString("active_preset_id", null)
            if (activePresetId != null) {
                map.putString("activePresetId", activePresetId)
            } else {
                map.putNull("activePresetId")
            }

            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting session info", e)
            promise.reject("ERROR", "Failed to get session info: ${e.message}")
        }
    }

    /**
     * Update the running session's end time (e.g. when an admin changes the preset timer mid-session).
     * Recalculates session_end_time from session_start_time + new duration.
     */
    @ReactMethod
    fun updateSessionEndTime(newEndTimeMs: Double, promise: Promise) {
        try {
            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE
            )
            val isActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            if (!isActive) {
                promise.resolve(false)
                return
            }
            sessionPrefs.edit()
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, newEndTimeMs.toLong())
                .putBoolean("no_time_limit", false)
                .apply()
            Log.d(TAG, "[UPDATE-END-TIME] Session end time updated to ${newEndTimeMs.toLong()}")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating session end time", e)
            promise.reject("ERROR", "Failed to update session end time: ${e.message}")
        }
    }

    /**
     * Force unlock - clears native SharedPreferences and stops blocking service.
     * This bypasses the timer check - use for testing/debug or when DB says unlocked.
     */
    @ReactMethod
    fun forceUnlock(promise: Promise) {
        try {
            val sessionPrefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Get the active preset info before clearing
            val activePresetId = sessionPrefs.getString("active_preset_id", null)
            val activePresetName = sessionPrefs.getString("active_preset_name", null)
            val wasNoTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)
            val wasScheduled = sessionPrefs.getBoolean("is_scheduled_preset", false)
            Log.d(TAG, "[FORCE-UNLOCK] forceUnlock called — clearing session for preset \"$activePresetName\" (id: $activePresetId, noTimeLimit: $wasNoTimeLimit, isScheduled: $wasScheduled)")

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
                .remove("custom_blocked_text")
                .remove("custom_overlay_image")
                .remove("custom_redirect_url")
                .remove("skip_overlay")
                .apply()
            Log.d(TAG, "[FORCE-UNLOCK] SharedPreferences cleared")

            // Cancel any pending timer alarm
            TimerAlarmManager.cancelTimerAlarm(reactApplicationContext)

            // If there was an active preset, deactivate it in ScheduleManager to prevent re-activation
            if (activePresetId != null) {
                Log.d(TAG, "[FORCE-UNLOCK] Deactivating preset \"$activePresetName\" in ScheduleManager")
                deactivatePresetInScheduleManager(activePresetId)
            }

            // Dismiss the floating bubble (async animation — new startBlocking will handle recreating)
            val bubbleManager = FloatingBubbleManager.getInstance(reactApplicationContext)
            Log.d(TAG, "[FORCE-UNLOCK] Dismissing bubble (currently showing: ${bubbleManager.isShowing()})")
            bubbleManager.dismiss()

            // Stop the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            Log.d(TAG, "[FORCE-UNLOCK] Complete — native session cleared, service stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "[FORCE-UNLOCK] Error in forceUnlock", e)
            promise.reject("ERROR", "Failed to force unlock: ${e.message}")
        }
    }

    /**
     * Check whether notifications are enabled for this app.
     */
    @ReactMethod
    fun areNotificationsEnabled(promise: Promise) {
        try {
            val enabled = NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled()
            promise.resolve(enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking notification permission", e)
            promise.reject("ERROR", "Failed to check notifications: ${e.message}")
        }
    }

    /**
     * Open the system notification settings for this app so the user can enable/disable notifications.
     */
    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = Intent().apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                    putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
                } else {
                    action = "android.settings.APP_NOTIFICATION_SETTINGS"
                    putExtra("app_package", reactApplicationContext.packageName)
                    putExtra("app_uid", reactApplicationContext.applicationInfo.uid)
                }
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening notification settings", e)
            promise.reject("ERROR", "Failed to open notification settings: ${e.message}")
        }
    }

    /**
     * Set whether the floating widget bubble is disabled for all sessions.
     */
    @ReactMethod
    fun setWidgetBubbleDisabled(disabled: Boolean, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            prefs.edit().putBoolean("widget_bubble_disabled", disabled).apply()

            val bubbleManager = FloatingBubbleManager.getInstance(reactApplicationContext)
            if (disabled) {
                // Dismiss the bubble immediately
                try {
                    bubbleManager.dismiss()
                } catch (e: Exception) {
                    Log.d(TAG, "Failed to dismiss floating bubble", e)
                }
            } else {
                // Re-show the bubble if there's an active session
                val isSessionActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                if (isSessionActive && !bubbleManager.isShowing()) {
                    try {
                        val noTimeLimit = prefs.getBoolean("no_time_limit", false)
                        if (noTimeLimit) {
                            val sessionStartTime = prefs.getLong("session_start_time", System.currentTimeMillis())
                            bubbleManager.showNoTimeLimit(sessionStartTime)
                        } else {
                            val sessionEndTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
                            if (sessionEndTime > System.currentTimeMillis()) {
                                bubbleManager.show(sessionEndTime)
                            }
                        }
                    } catch (e: Exception) {
                        Log.d(TAG, "Failed to re-show floating bubble", e)
                    }
                }
            }

            Log.d(TAG, "Widget bubble disabled set to: $disabled")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting widget bubble disabled", e)
            promise.reject("ERROR", "Failed to set widget bubble disabled: ${e.message}")
        }
    }

    /**
     * Get whether the floating widget bubble is disabled.
     */
    @ReactMethod
    fun getWidgetBubbleDisabled(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val disabled = prefs.getBoolean("widget_bubble_disabled", false)
            promise.resolve(disabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting widget bubble disabled", e)
            promise.reject("ERROR", "Failed to get widget bubble disabled: ${e.message}")
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
