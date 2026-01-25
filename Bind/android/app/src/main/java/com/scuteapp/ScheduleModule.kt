package com.scuteapp

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

/**
 * Native module for scheduling presets from React Native.
 */
class ScheduleModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "ScheduleModule"
        private const val LAUNCH_PREFS = "scute_launch_prefs"
    }

    override fun getName(): String = "ScheduleModule"

    /**
     * Save scheduled presets and set up alarms
     * @param presetsJson JSON array string of scheduled presets
     */
    @ReactMethod
    fun saveScheduledPresets(presetsJson: String, promise: Promise) {
        try {
            Log.d(TAG, "saveScheduledPresets called")
            ScheduleManager.saveScheduledPresets(reactApplicationContext, presetsJson)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving scheduled presets", e)
            promise.reject("ERROR", "Failed to save scheduled presets: ${e.message}")
        }
    }

    /**
     * Reschedule all preset alarms (e.g., after app restart)
     */
    @ReactMethod
    fun reschedulePresets(promise: Promise) {
        try {
            Log.d(TAG, "reschedulePresets called")
            ScheduleManager.rescheduleAllPresets(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error rescheduling presets", e)
            promise.reject("ERROR", "Failed to reschedule presets: ${e.message}")
        }
    }

    /**
     * Cancel alarm for a specific preset
     */
    @ReactMethod
    fun cancelPresetAlarm(presetId: String, promise: Promise) {
        try {
            Log.d(TAG, "cancelPresetAlarm called for $presetId")
            ScheduleManager.cancelPresetAlarm(reactApplicationContext, presetId)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling preset alarm", e)
            promise.reject("ERROR", "Failed to cancel preset alarm: ${e.message}")
        }
    }

    /**
     * Check if the app was launched from a scheduled preset alarm.
     * Returns the launch data if so, or null if not.
     */
    @ReactMethod
    fun getScheduledLaunchData(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(LAUNCH_PREFS, Context.MODE_PRIVATE)
            val wasLaunchedFromAlarm = prefs.getBoolean("scheduled_preset_activated", false)

            if (!wasLaunchedFromAlarm) {
                promise.resolve(null)
                return
            }

            // Check if launch was recent (within last 30 seconds) to avoid stale data
            val launchTime = prefs.getLong("scheduled_launch_time", 0)
            val now = System.currentTimeMillis()
            if (now - launchTime > 30000) {
                // Launch data is stale, clear it
                clearScheduledLaunchDataInternal()
                promise.resolve(null)
                return
            }

            val result: WritableMap = Arguments.createMap()
            result.putBoolean("launched", true)
            result.putString("presetId", prefs.getString("scheduled_preset_id", null))
            result.putString("presetName", prefs.getString("scheduled_preset_name", null))
            result.putDouble("launchTime", launchTime.toDouble())

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting scheduled launch data", e)
            promise.reject("ERROR", "Failed to get scheduled launch data: ${e.message}")
        }
    }

    /**
     * Clear the scheduled launch data (call after handling the launch)
     */
    @ReactMethod
    fun clearScheduledLaunchData(promise: Promise) {
        try {
            clearScheduledLaunchDataInternal()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing scheduled launch data", e)
            promise.reject("ERROR", "Failed to clear scheduled launch data: ${e.message}")
        }
    }

    private fun clearScheduledLaunchDataInternal() {
        val prefs = reactApplicationContext.getSharedPreferences(LAUNCH_PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .remove("scheduled_preset_activated")
            .remove("scheduled_preset_id")
            .remove("scheduled_preset_name")
            .remove("scheduled_launch_time")
            .apply()
        Log.d(TAG, "Cleared scheduled launch data")
    }

    /**
     * Check if the app was launched from the blocked overlay (tap to dismiss).
     * Returns true if so, and clears the flag.
     */
    @ReactMethod
    fun getBlockedOverlayLaunchData(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(LAUNCH_PREFS, Context.MODE_PRIVATE)
            val wasLaunchedFromOverlay = prefs.getBoolean("from_blocked_overlay", false)

            if (!wasLaunchedFromOverlay) {
                promise.resolve(null)
                return
            }

            // Check if launch was recent (within last 10 seconds) to avoid stale data
            val launchTime = prefs.getLong("blocked_overlay_launch_time", 0)
            val now = System.currentTimeMillis()
            if (now - launchTime > 10000) {
                // Launch data is stale, clear it
                clearBlockedOverlayLaunchDataInternal()
                promise.resolve(null)
                return
            }

            val result: WritableMap = Arguments.createMap()
            result.putBoolean("fromBlockedOverlay", true)
            result.putDouble("launchTime", launchTime.toDouble())

            // Clear after reading so we don't redirect multiple times
            clearBlockedOverlayLaunchDataInternal()

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting blocked overlay launch data", e)
            promise.reject("ERROR", "Failed to get blocked overlay launch data: ${e.message}")
        }
    }

    private fun clearBlockedOverlayLaunchDataInternal() {
        val prefs = reactApplicationContext.getSharedPreferences(LAUNCH_PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .remove("from_blocked_overlay")
            .remove("blocked_overlay_launch_time")
            .apply()
        Log.d(TAG, "Cleared blocked overlay launch data")
    }

    /**
     * Check if we can schedule exact alarms (required for Android 12+)
     */
    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        try {
            val canSchedule = ScheduleManager.canScheduleExactAlarms(reactApplicationContext)
            promise.resolve(canSchedule)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking exact alarm permission", e)
            promise.reject("ERROR", "Failed to check exact alarm permission: ${e.message}")
        }
    }

}
