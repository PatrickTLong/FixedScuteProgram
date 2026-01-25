package com.scuteapp

import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private const val NFC_PREFS = "scute_nfc_prefs"
        private const val KEY_REGISTERED_TAG_ID = "registered_tag_id"
        private const val KEY_TAP_CONFIG = "tap_config"

        // Flag to indicate if React Native is handling NFC (foreground mode)
        @Volatile
        var reactNfcEnabled = false
    }

    override fun getMainComponentName(): String = "Scute"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Handle NFC on cold start (app was not running)
        if (savedInstanceState == null) {
            handleIntent(intent)
        }
        // Check if launched from scheduled preset alarm
        checkScheduledPresetLaunch(intent)
        // Check if launched from blocked overlay (tap to dismiss)
        checkBlockedOverlayLaunch(intent)

        // CRITICAL: Re-register all scheduled preset alarms on app launch
        // This ensures alarms persist even if they were cancelled when the app was
        // force-stopped or killed by battery optimization. Every time the user opens
        // the app, we refresh the alarms so they're ready to fire.
        ScheduleManager.rescheduleAllPresets(this)
    }

    /**
     * Check if the app was launched from a scheduled preset alarm
     * and store the launch data so React Native can handle it
     */
    private fun checkScheduledPresetLaunch(intent: Intent?) {
        if (intent?.getBooleanExtra("scheduled_preset_activated", false) == true) {
            val presetId = intent.getStringExtra("preset_id")
            val presetName = intent.getStringExtra("preset_name")
            Log.d(TAG, "App launched from scheduled preset alarm: $presetName ($presetId)")

            // Store in SharedPreferences so React Native can read it
            val prefs = getSharedPreferences("scute_launch_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("scheduled_preset_activated", true)
                .putString("scheduled_preset_id", presetId)
                .putString("scheduled_preset_name", presetName)
                .putLong("scheduled_launch_time", System.currentTimeMillis())
                .apply()
        }
    }

    /**
     * Check if the app was launched from the blocked overlay (tap to dismiss)
     * and store the launch data so React Native can redirect to home
     */
    private fun checkBlockedOverlayLaunch(intent: Intent?) {
        if (intent?.getBooleanExtra("from_blocked_overlay", false) == true) {
            Log.d(TAG, "App launched from blocked overlay - signaling to redirect to home")

            // Store in SharedPreferences so React Native can read it
            val prefs = getSharedPreferences("scute_launch_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("from_blocked_overlay", true)
                .putLong("blocked_overlay_launch_time", System.currentTimeMillis())
                .apply()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)

        // Check if launched from scheduled preset alarm
        checkScheduledPresetLaunch(intent)
        // Check if launched from blocked overlay (tap to dismiss)
        checkBlockedOverlayLaunch(intent)

        // Check if this is an NFC intent
        val isNfcIntent = intent.action == NfcAdapter.ACTION_TAG_DISCOVERED ||
                         intent.action == NfcAdapter.ACTION_TECH_DISCOVERED ||
                         intent.action == NfcAdapter.ACTION_NDEF_DISCOVERED

        // If React Native foreground dispatch is active, let React Native handle it
        // This prevents double-handling when user is in the app
        if (reactNfcEnabled && isNfcIntent) {
            Log.d(TAG, "React NFC enabled - letting React Native handle NFC intent")
            return
        }

        // Handle NFC for session toggling when React Native is not handling it
        // (e.g., when app is launched from background via NDEF)
        if (isNfcIntent) {
            val handled = handleIntent(intent)
            if (handled) {
                Log.d(TAG, "NFC handled by MainActivity for session toggle")
            } else {
                Log.d(TAG, "NFC not handled by MainActivity - React Native can handle it")
            }
        }
    }

    private fun handleIntent(intent: Intent?): Boolean {
        if (intent == null) return false

        // Check if this is an NFC intent
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_TECH_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action) {

            val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            }

            return tag?.let { handleNfcTag(it) } ?: false
        }
        return false
    }

    private fun handleNfcTag(tag: Tag): Boolean {
        val tagId = bytesToHex(tag.id)
        Log.d(TAG, "NFC tag detected in background: $tagId")

        // Get stored registered tag ID
        val nfcPrefs = getSharedPreferences(NFC_PREFS, Context.MODE_PRIVATE)
        val registeredTagId = nfcPrefs.getString(KEY_REGISTERED_TAG_ID, null)

        if (registeredTagId == null) {
            Log.d(TAG, "No registered tag - React Native will handle registration")
            // Return false so React Native can handle tag registration
            return false
        }

        // Normalize and compare tag IDs
        val normalizedScanned = tagId.replace(":", "").uppercase()
        val normalizedRegistered = registeredTagId.replace(":", "").uppercase()

        if (normalizedScanned != normalizedRegistered) {
            Log.d(TAG, "Tag doesn't match registered tag. Scanned: $normalizedScanned, Registered: $normalizedRegistered")
            vibrateError()
            return true  // We handled it (by rejecting it)
        }

        Log.d(TAG, "Tag matches! Toggling session...")

        // Check current session status and toggle
        val sessionPrefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        val isActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
        val endTime = sessionPrefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
        val isSessionValid = isActive && System.currentTimeMillis() <= endTime

        if (isSessionValid) {
            // Session is active - check if we can unlock
            val noTimeLimit = sessionPrefs.getBoolean("no_time_limit", false)
            if (!noTimeLimit) {
                // Timer is running, don't allow unlock
                Log.d(TAG, "Timer still active, unlock not allowed")
                vibrateError()
                return true  // We handled it (by preventing unlock)
            }

            // Stop the session
            stopSession(sessionPrefs)
            vibrateSuccess()
            Log.d(TAG, "Session stopped via NFC")
            return true  // We handled it successfully
        } else {
            // No active session - start one using saved config
            val tapConfig = nfcPrefs.getString(KEY_TAP_CONFIG, null)
            if (tapConfig == null) {
                Log.d(TAG, "No tap config saved, can't start session")
                vibrateError()
                return true  // We handled it (by showing error)
            }

            startSessionFromConfig(sessionPrefs, tapConfig)
            vibrateSuccess()
            Log.d(TAG, "Session started via NFC")
            return true  // We handled it successfully
        }
    }

    private fun stopSession(prefs: android.content.SharedPreferences) {
        prefs.edit()
            .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
            .apply()

        val serviceIntent = Intent(this, UninstallBlockerService::class.java)
        stopService(serviceIntent)
    }

    private fun startSessionFromConfig(sessionPrefs: android.content.SharedPreferences, tapConfig: String) {
        try {
            // Parse the JSON config
            val json = org.json.JSONObject(tapConfig)

            // Get blocked apps
            val appSet = mutableSetOf<String>()
            val blockedAppsArray = json.optJSONArray("blockedApps")
            if (blockedAppsArray != null) {
                for (i in 0 until blockedAppsArray.length()) {
                    appSet.add(blockedAppsArray.getString(i))
                }
            }

            // Get blocked websites
            val websiteSet = mutableSetOf<String>()
            val blockedWebsitesArray = json.optJSONArray("blockedWebsites")
            if (blockedWebsitesArray != null) {
                for (i in 0 until blockedWebsitesArray.length()) {
                    websiteSet.add(blockedWebsitesArray.getString(i))
                }
            }

            // Get duration
            val durationMs = json.optLong("durationMs", 3600000) // Default 1 hour
            val noTimeLimit = json.optBoolean("noTimeLimit", false)

            val endTime = if (noTimeLimit) {
                System.currentTimeMillis() + Long.MAX_VALUE / 2
            } else {
                System.currentTimeMillis() + durationMs
            }

            sessionPrefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, appSet)
                .putStringSet("blocked_websites", websiteSet)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, endTime)
                .putBoolean("no_time_limit", noTimeLimit)
                .apply()

            // Start the foreground service
            val serviceIntent = Intent(this, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            Log.d(TAG, "Session started with ${appSet.size} apps, ${websiteSet.size} websites, duration: ${durationMs}ms")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing tap config", e)
        }
    }

    private fun vibrateSuccess() {
        vibrate(longArrayOf(0, 300, 100, 300))
    }

    private fun vibrateError() {
        vibrate(longArrayOf(0, 100, 50, 100, 50, 100))
    }

    private fun vibrate(pattern: LongArray) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexArray = "0123456789ABCDEF".toCharArray()
        val hexChars = CharArray(bytes.size * 2)
        for (i in bytes.indices) {
            val v = bytes[i].toInt() and 0xFF
            hexChars[i * 2] = hexArray[v ushr 4]
            hexChars[i * 2 + 1] = hexArray[v and 0x0F]
        }
        return String(hexChars)
    }
}
