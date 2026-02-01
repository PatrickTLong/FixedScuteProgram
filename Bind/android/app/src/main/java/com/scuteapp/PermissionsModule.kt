package com.scuteapp

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module for checking system permission states.
 */
class PermissionsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "PermissionsModule"
    }

    override fun getName(): String = "PermissionsModule"

    /**
     * Check all permission states at once
     */
    @ReactMethod
    fun checkAllPermissions(promise: Promise) {
        try {
            val result = Arguments.createMap().apply {
                putBoolean("notification", isNotificationListenerEnabled())
                putBoolean("accessibility", isAccessibilityServiceEnabled())
                putBoolean("usageAccess", isUsageAccessGranted())
                putBoolean("displayOverlay", canDrawOverlays())
                putBoolean("deviceAdmin", isDeviceAdminActive())
                putBoolean("alarms", canScheduleExactAlarms())
                putBoolean("postNotifications", isPostNotificationsEnabled())
                putBoolean("batteryOptimization", isBatteryOptimizationDisabled())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permissions", e)
            promise.reject("ERROR", "Failed to check permissions: ${e.message}")
        }
    }

    /**
     * Check if notification listener is enabled
     */
    @ReactMethod
    fun isNotificationListenerEnabled(promise: Promise) {
        promise.resolve(isNotificationListenerEnabled())
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val packageName = reactApplicationContext.packageName
        val flat = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            "enabled_notification_listeners"
        )
        return flat?.contains(packageName) == true
    }

    /**
     * Check if accessibility service is enabled
     */
    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        promise.resolve(isAccessibilityServiceEnabled())
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val accessibilityManager = reactApplicationContext.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = accessibilityManager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)

        for (service in enabledServices) {
            if (service.resolveInfo.serviceInfo.packageName == reactApplicationContext.packageName) {
                return true
            }
        }
        return false
    }

    /**
     * Check if usage access is granted
     */
    @ReactMethod
    fun isUsageAccessGranted(promise: Promise) {
        promise.resolve(isUsageAccessGranted())
    }

    private fun isUsageAccessGranted(): Boolean {
        val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            reactApplicationContext.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /**
     * Check if can draw overlays
     */
    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        promise.resolve(canDrawOverlays())
    }

    private fun canDrawOverlays(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(reactApplicationContext)
        } else {
            true
        }
    }

    /**
     * Check if device admin is active
     */
    @ReactMethod
    fun isDeviceAdminActive(promise: Promise) {
        promise.resolve(isDeviceAdminActive())
    }

    private fun isDeviceAdminActive(): Boolean {
        val devicePolicyManager = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(reactApplicationContext, BindDeviceAdminReceiver::class.java)
        return devicePolicyManager.isAdminActive(adminComponent)
    }

    /**
     * Check if can schedule exact alarms
     */
    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        promise.resolve(canScheduleExactAlarms())
    }

    private fun canScheduleExactAlarms(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }
    }

    /**
     * Check if post notifications permission is enabled (Android 13+)
     */
    @ReactMethod
    fun isPostNotificationsEnabled(promise: Promise) {
        promise.resolve(isPostNotificationsEnabled())
    }

    private fun isPostNotificationsEnabled(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.areNotificationsEnabled()
        } else {
            // Before Android 13, notifications are enabled by default
            true
        }
    }

    /**
     * Request device admin activation
     */
    @ReactMethod
    fun requestDeviceAdmin(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("ERROR", "No current activity")
                return
            }
            val adminComponent = ComponentName(reactApplicationContext, BindDeviceAdminReceiver::class.java)
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Scute needs device admin to prevent uninstallation during blocking sessions.")
            }
            activity.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting device admin", e)
            promise.reject("ERROR", "Failed to request device admin: ${e.message}")
        }
    }

    /**
     * Open usage access settings, highlighting this app
     */
    @ReactMethod
    fun openUsageAccessSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            // Some devices don't support the package URI, fall back without it
            try {
                val fallbackIntent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(fallbackIntent)
                promise.resolve(true)
            } catch (e2: Exception) {
                Log.e(TAG, "Error opening usage access settings", e2)
                promise.reject("ERROR", "Failed to open usage access settings: ${e2.message}")
            }
        }
    }

    /**
     * Open overlay permission settings, highlighting this app
     */
    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening overlay settings", e)
            promise.reject("ERROR", "Failed to open overlay settings: ${e.message}")
        }
    }

    /**
     * Open the alarms & reminders permission settings screen
     */
    @ReactMethod
    fun openAlarmPermissionSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                // Before Android 12, exact alarms are allowed by default
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening alarm permission settings", e)
            promise.reject("ERROR", "Failed to open alarm settings: ${e.message}")
        }
    }

    /**
     * Check if battery optimization is disabled (app is whitelisted)
     * Returns true if the app is NOT being optimized (which is what we want)
     */
    @ReactMethod
    fun isBatteryOptimizationDisabled(promise: Promise) {
        promise.resolve(isBatteryOptimizationDisabled())
    }

    private fun isBatteryOptimizationDisabled(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
        } else {
            // Before Android 6, battery optimization didn't exist
            true
        }
    }

    /**
     * Open battery optimization settings to let user disable it for this app
     * This directly requests to disable battery optimization for our app
     */
    @ReactMethod
    fun requestDisableBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                // Before Android 6, battery optimization didn't exist
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting battery optimization disable", e)
            // Fallback: open general battery optimization settings
            try {
                val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(fallbackIntent)
                promise.resolve(true)
            } catch (e2: Exception) {
                Log.e(TAG, "Error opening battery settings fallback", e2)
                promise.reject("ERROR", "Failed to open battery settings: ${e2.message}")
            }
        }
    }
}
