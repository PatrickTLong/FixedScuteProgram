package com.bind

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module for storing NFC config that can be accessed by MainActivity.
 */
class NfcConfigModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NfcConfigModule"
        private const val NFC_PREFS = "scute_nfc_prefs"
        private const val KEY_REGISTERED_TAG_ID = "registered_tag_id"
        private const val KEY_TAP_CONFIG = "tap_config"
    }

    override fun getName(): String = "NfcConfigModule"

    /**
     * Save the registered tag ID so native code can validate NFC taps
     */
    @ReactMethod
    fun setRegisteredTagId(tagId: String?, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(NFC_PREFS, Context.MODE_PRIVATE)
            if (tagId == null) {
                prefs.edit().remove(KEY_REGISTERED_TAG_ID).apply()
            } else {
                prefs.edit().putString(KEY_REGISTERED_TAG_ID, tagId).apply()
            }
            Log.d(TAG, "Saved registered tag ID: $tagId")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving tag ID", e)
            promise.reject("ERROR", "Failed to save tag ID: ${e.message}")
        }
    }

    /**
     * Save the tap config JSON so native code can start sessions
     */
    @ReactMethod
    fun setTapConfig(configJson: String?, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(NFC_PREFS, Context.MODE_PRIVATE)
            if (configJson == null) {
                prefs.edit().remove(KEY_TAP_CONFIG).apply()
            } else {
                prefs.edit().putString(KEY_TAP_CONFIG, configJson).apply()
            }
            Log.d(TAG, "Saved tap config: $configJson")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving tap config", e)
            promise.reject("ERROR", "Failed to save tap config: ${e.message}")
        }
    }

    /**
     * Get the registered tag ID
     */
    @ReactMethod
    fun getRegisteredTagId(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(NFC_PREFS, Context.MODE_PRIVATE)
            val tagId = prefs.getString(KEY_REGISTERED_TAG_ID, null)
            promise.resolve(tagId)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting tag ID", e)
            promise.reject("ERROR", "Failed to get tag ID: ${e.message}")
        }
    }

    /**
     * Get the tap config JSON
     */
    @ReactMethod
    fun getTapConfig(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(NFC_PREFS, Context.MODE_PRIVATE)
            val config = prefs.getString(KEY_TAP_CONFIG, null)
            promise.resolve(config)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting tap config", e)
            promise.reject("ERROR", "Failed to get tap config: ${e.message}")
        }
    }

    /**
     * Enable/disable React Native NFC handling
     * When enabled, MainActivity will NOT handle NFC intents (React handles them)
     * When disabled, MainActivity will handle NFC intents (for background/cold start)
     */
    @ReactMethod
    fun setReactNfcEnabled(enabled: Boolean, promise: Promise) {
        try {
            MainActivity.reactNfcEnabled = enabled
            Log.d(TAG, "React NFC enabled: $enabled")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting React NFC enabled", e)
            promise.reject("ERROR", "Failed to set React NFC enabled: ${e.message}")
        }
    }
}
