package com.scuteapp

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.WindowManager

/**
 * Simple app monitor using UsageStats with fast polling.
 * Detects foreground app changes and shows blocking overlay when needed.
 */
class AppMonitorService(private val context: Context) {

    companion object {
        private const val TAG = "AppMonitorService"
        private const val POLL_INTERVAL_MS = 15L // Poll every 15ms for instant detection (especially for Settings)

        @Volatile
        var instance: AppMonitorService? = null
            private set
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private var lastForegroundPackage: String? = null
    private var overlayManager: BlockedOverlayManager? = null

    // Callback to go home (will be set by whoever starts monitoring)
    var onGoHome: (() -> Unit)? = null

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring) return

            checkForegroundApp()
            handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    /**
     * Start monitoring foreground apps
     */
    fun startMonitoring() {
        if (isMonitoring) return

        instance = this

        // Create overlay manager
        overlayManager = BlockedOverlayManager(context).apply {
            onDismissed = {
                onGoHome?.invoke()
            }
        }

        isMonitoring = true
        handler.post(monitorRunnable)
        Log.d(TAG, "Started monitoring with ${POLL_INTERVAL_MS}ms polling")
    }

    /**
     * Stop monitoring
     */
    fun stopMonitoring() {
        isMonitoring = false
        handler.removeCallbacks(monitorRunnable)
        overlayManager?.dismiss()
        overlayManager = null
        instance = null
        Log.d(TAG, "Stopped monitoring")
    }

    /**
     * Block Settings immediately (called by AccessibilityService for instant blocking)
     */
    fun blockSettingsNow(packageName: String) {
        // Skip if already showing overlay
        if (overlayManager?.isShowing() == true) return

        // Dismiss keyboard immediately to prevent janky push/shift
        dismissKeyboard()

        Log.d(TAG, "BLOCKING Settings (instant via Accessibility): $packageName")
        showBlockedOverlay(packageName)
    }

    /**
     * Dismiss the soft keyboard
     */
    private fun dismissKeyboard() {
        try {
            val inputMethodManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
            inputMethodManager?.hideSoftInputFromWindow(null, 0)
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing keyboard", e)
        }
    }

    /**
     * Check if we have usage stats permission
     */
    fun hasUsageStatsPermission(): Boolean {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return false

        val now = System.currentTimeMillis()
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            now - 1000 * 60,
            now
        )
        return stats != null && stats.isNotEmpty()
    }

    /**
     * Get the current foreground app package name
     */
    private fun getForegroundPackage(): String? {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return null

        val now = System.currentTimeMillis()
        // Query last 1 second only (more efficient than 5 seconds)
        val events = usageStatsManager.queryEvents(now - 1000, now)
        val event = UsageEvents.Event()

        var foregroundPackage: String? = null

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                foregroundPackage = event.packageName
            }
        }

        return foregroundPackage
    }

    /**
     * Check foreground app and block if needed
     */
    private fun checkForegroundApp() {
        val currentPackage = getForegroundPackage() ?: return

        // Skip if same as last check
        if (currentPackage == lastForegroundPackage) return
        lastForegroundPackage = currentPackage

        // Skip our own app for blocking purposes
        if (currentPackage == "com.scuteapp") {
            return
        }

        // Skip Settings apps - they're handled instantly by AccessibilityService
        if (isSettingsApp(currentPackage)) return

        // Skip if overlay is already showing
        if (overlayManager?.isShowing() == true) return

        // Check if should block
        if (shouldBlockApp(currentPackage)) {
            Log.d(TAG, "BLOCKING app: $currentPackage")
            showBlockedOverlay(currentPackage)
        }
    }

    /**
     * Check if app should be blocked
     */
    private fun shouldBlockApp(packageName: String): Boolean {
        val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

        // Check if session is active
        val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
        if (!isActive) return false

        // Check if session has expired
        val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
        if (System.currentTimeMillis() > endTime) return false

        // Check if this package is in the blocked list
        val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
        return blockedApps?.contains(packageName) == true
    }

    /**
     * Show blocking overlay
     */
    private fun showBlockedOverlay(packageName: String) {
        val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        val strictMode = prefs.getBoolean("strict_mode", true)

        val blockedType = if (isSettingsApp(packageName)) {
            BlockedOverlayManager.TYPE_SETTINGS
        } else {
            BlockedOverlayManager.TYPE_APP
        }

        // Get app name
        val appName = try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            null
        }

        // Pause media
        pauseMedia()

        // Show overlay instantly with app name
        val shown = overlayManager?.show(blockedType, packageName, appName, strictMode) ?: false

        if (!shown) {
            Log.w(TAG, "Failed to show overlay, falling back to activity")
            // Fallback: launch BlockedActivity (no HOME action - just show activity)
            BlockedActivity.launchNoAnimation(context, blockedType, packageName, strictMode)
        }
    }

    private fun isSettingsApp(packageName: String): Boolean {
        // Check exact package names first
        if (packageName == "com.android.settings" ||
            packageName == "com.samsung.android.settings" ||
            packageName == "com.samsung.android.setting.multisoundmain" ||
            packageName == "com.miui.securitycenter" ||
            packageName == "com.coloros.settings" ||
            packageName == "com.oppo.settings" ||
            packageName == "com.vivo.settings" ||
            packageName == "com.huawei.systemmanager" ||
            packageName == "com.oneplus.settings" ||
            packageName == "com.google.android.settings.intelligence" ||
            packageName == "com.android.provision" ||
            packageName == "com.lge.settings" ||
            packageName == "com.asus.settings" ||
            packageName == "com.sony.settings") {
            return true
        }

        // Fallback: check if package name contains "settings" (catches variants)
        return packageName.contains("settings", ignoreCase = true)
    }

    private fun pauseMedia() {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            if (audioManager?.isMusicActive == true) {
                val keyEvent = android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PAUSE)
                audioManager.dispatchMediaKeyEvent(keyEvent)
                val keyEventUp = android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_PAUSE)
                audioManager.dispatchMediaKeyEvent(keyEventUp)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error pausing media", e)
        }
    }
}
