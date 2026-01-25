package com.scuteapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/**
 * React Native module for website blocking via local VPN.
 */
class WebsiteBlockerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val TAG = "WebsiteBlockerModule"
        private const val VPN_REQUEST_CODE = 2001
    }

    private var vpnPermissionPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "WebsiteBlockerModule"

    /**
     * Check if VPN permission is granted
     */
    @ReactMethod
    fun isVpnPermissionGranted(promise: Promise) {
        try {
            val intent = VpnService.prepare(reactApplicationContext)
            promise.resolve(intent == null)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking VPN permission", e)
            promise.reject("ERROR", "Failed to check VPN permission: ${e.message}")
        }
    }

    /**
     * Request VPN permission from user
     */
    @ReactMethod
    fun requestVpnPermission(promise: Promise) {
        try {
            val intent = VpnService.prepare(reactApplicationContext)
            if (intent == null) {
                // Already have permission
                promise.resolve(true)
                return
            }

            vpnPermissionPromise = promise
            reactApplicationContext.currentActivity?.startActivityForResult(intent, VPN_REQUEST_CODE)
                ?: promise.reject("ERROR", "No activity available")
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting VPN permission", e)
            promise.reject("ERROR", "Failed to request VPN permission: ${e.message}")
        }
    }

    /**
     * Start the website blocking VPN
     */
    @ReactMethod
    fun startBlocking(blockedWebsites: ReadableArray, promise: Promise) {
        try {
            // First check if we have VPN permission
            val prepareIntent = VpnService.prepare(reactApplicationContext)
            if (prepareIntent != null) {
                promise.reject("NO_PERMISSION", "VPN permission not granted. Call requestVpnPermission first.")
                return
            }

            // Save blocked websites to shared prefs (VPN service will read from there)
            val prefs = reactApplicationContext.getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val websiteSet = mutableSetOf<String>()
            for (i in 0 until blockedWebsites.size()) {
                blockedWebsites.getString(i)?.let { websiteSet.add(it.lowercase()) }
            }

            prefs.edit()
                .putStringSet("blocked_websites", websiteSet)
                .apply()

            // Start VPN service
            val serviceIntent = Intent(reactApplicationContext, WebsiteBlockerVpnService::class.java).apply {
                action = WebsiteBlockerVpnService.ACTION_START
            }
            reactApplicationContext.startService(serviceIntent)

            Log.d(TAG, "Started website blocking with ${websiteSet.size} domains")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting website blocking", e)
            promise.reject("ERROR", "Failed to start website blocking: ${e.message}")
        }
    }

    /**
     * Stop the website blocking VPN
     */
    @ReactMethod
    fun stopBlocking(promise: Promise) {
        try {
            val serviceIntent = Intent(reactApplicationContext, WebsiteBlockerVpnService::class.java).apply {
                action = WebsiteBlockerVpnService.ACTION_STOP
            }
            reactApplicationContext.startService(serviceIntent)

            Log.d(TAG, "Stopped website blocking")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping website blocking", e)
            promise.reject("ERROR", "Failed to stop website blocking: ${e.message}")
        }
    }

    /**
     * Check if VPN is currently running
     */
    @ReactMethod
    fun isBlocking(promise: Promise) {
        promise.resolve(WebsiteBlockerVpnService.isRunning)
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == VPN_REQUEST_CODE) {
            val granted = resultCode == Activity.RESULT_OK
            vpnPermissionPromise?.resolve(granted)
            vpnPermissionPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {
        // Not needed
    }
}
