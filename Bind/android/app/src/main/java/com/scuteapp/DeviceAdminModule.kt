package com.scuteapp

import android.app.Activity
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/**
 * Native module for managing device admin and uninstall protection.
 */
class DeviceAdminModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val TAG = "DeviceAdminModule"
        private const val REQUEST_CODE_ENABLE_ADMIN = 1001
    }

    private var enableAdminPromise: Promise? = null
    private val devicePolicyManager: DevicePolicyManager by lazy {
        reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    }
    private val adminComponent: ComponentName by lazy {
        ComponentName(reactApplicationContext, BindDeviceAdminReceiver::class.java)
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String {
        return "DeviceAdminModule"
    }

    /**
     * Check if device admin is currently enabled
     */
    @ReactMethod
    fun isDeviceAdminActive(promise: Promise) {
        try {
            val isActive = devicePolicyManager.isAdminActive(adminComponent)
            promise.resolve(isActive)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking admin status", e)
            promise.reject("ERROR", "Failed to check admin status: ${e.message}")
        }
    }

    /**
     * Request to enable device admin
     */
    @ReactMethod
    fun requestEnableDeviceAdmin(promise: Promise) {
        try {
            if (devicePolicyManager.isAdminActive(adminComponent)) {
                promise.resolve(true)
                return
            }

            enableAdminPromise = promise

            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "Scute needs device admin access to prevent uninstalling blocked apps during your focus sessions."
                )
            }

            reactApplicationContext.currentActivity?.startActivityForResult(intent, REQUEST_CODE_ENABLE_ADMIN)
                ?: promise.reject("ERROR", "No activity available")
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting admin", e)
            promise.reject("ERROR", "Failed to request admin: ${e.message}")
        }
    }

    /**
     * Disable device admin (required before uninstalling the app)
     */
    @ReactMethod
    fun disableDeviceAdmin(promise: Promise) {
        try {
            if (!devicePolicyManager.isAdminActive(adminComponent)) {
                promise.resolve(true)
                return
            }

            devicePolicyManager.removeActiveAdmin(adminComponent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling admin", e)
            promise.reject("ERROR", "Failed to disable admin: ${e.message}")
        }
    }

    /**
     * Start a blocking session with specified apps
     */
    @ReactMethod
    fun startBlockingSession(blockedApps: ReadableArray, durationMs: Double, promise: Promise) {
        startBlockingSessionWithWebsites(blockedApps, null, durationMs, promise)
    }

    /**
     * Start a blocking session with specified apps and websites
     */
    @ReactMethod
    fun startBlockingSessionWithWebsites(blockedApps: ReadableArray, blockedWebsites: ReadableArray?, durationMs: Double, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            // Convert ReadableArray to Set<String> for apps
            val appSet = mutableSetOf<String>()
            for (i in 0 until blockedApps.size()) {
                blockedApps.getString(i)?.let { appSet.add(it) }
            }

            // Convert ReadableArray to Set<String> for websites
            val websiteSet = mutableSetOf<String>()
            blockedWebsites?.let { websites ->
                for (i in 0 until websites.size()) {
                    websites.getString(i)?.let { websiteSet.add(it) }
                }
            }

            val endTime = System.currentTimeMillis() + durationMs.toLong()
            // Check if this is a "no time limit" session (max int value = ~24.8 days)
            val isNoTimeLimit = durationMs >= 2147483647.0

            prefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, appSet)
                .putStringSet("blocked_websites", websiteSet)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, endTime)
                .putBoolean("no_time_limit", isNoTimeLimit)
                .apply()

            // Start the foreground service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }

            Log.d(TAG, "Blocking session started with ${appSet.size} apps and ${websiteSet.size} websites for ${durationMs}ms")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting blocking session", e)
            promise.reject("ERROR", "Failed to start blocking session: ${e.message}")
        }
    }

    /**
     * Stop the current blocking session
     */
    @ReactMethod
    fun stopBlockingSession(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            prefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                .apply()

            // Stop the service
            val serviceIntent = Intent(reactApplicationContext, UninstallBlockerService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            Log.d(TAG, "Blocking session stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping blocking session", e)
            promise.reject("ERROR", "Failed to stop blocking session: ${e.message}")
        }
    }

    /**
     * Check if the UninstallBlockerService is currently running
     */
    private fun isServiceRunning(): Boolean {
        val activityManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        @Suppress("DEPRECATION")
        activityManager?.getRunningServices(Int.MAX_VALUE)?.forEach { service ->
            if (UninstallBlockerService::class.java.name == service.service.className) {
                return true
            }
        }
        return false
    }

    /**
     * Check if a blocking session is currently active
     */
    @ReactMethod
    fun isSessionActive(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val serviceRunning = isServiceRunning()

            // If service isn't running, session is not active regardless of prefs
            if (!serviceRunning) {
                // Clean up stale prefs if needed
                if (isActive) {
                    prefs.edit()
                        .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                        .apply()
                }
                promise.resolve(false)
                return
            }

            // Check if session has expired
            if (isActive && System.currentTimeMillis() > endTime) {
                // Session expired, clean up
                prefs.edit()
                    .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                    .apply()
                promise.resolve(false)
                return
            }

            promise.resolve(isActive)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking session status", e)
            promise.reject("ERROR", "Failed to check session status: ${e.message}")
        }
    }

    /**
     * Get session info including remaining time
     */
    @ReactMethod
    fun getSessionInfo(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())

            val noTimeLimit = prefs.getBoolean("no_time_limit", false)

            val result = Arguments.createMap().apply {
                putBoolean("isActive", isActive && System.currentTimeMillis() <= endTime)
                putDouble("endTime", endTime.toDouble())
                putDouble("remainingMs", maxOf(0, endTime - System.currentTimeMillis()).toDouble())
                putInt("blockedAppsCount", blockedApps?.size ?: 0)
                putBoolean("noTimeLimit", noTimeLimit)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting session info", e)
            promise.reject("ERROR", "Failed to get session info: ${e.message}")
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_ENABLE_ADMIN) {
            val isEnabled = devicePolicyManager.isAdminActive(adminComponent)
            enableAdminPromise?.resolve(isEnabled)
            enableAdminPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {
        // Not needed
    }
}
