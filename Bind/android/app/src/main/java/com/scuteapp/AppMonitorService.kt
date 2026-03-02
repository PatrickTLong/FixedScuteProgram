package com.scuteapp

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * App monitor using UsageStats with fast polling.
 * Detects foreground app changes and shows blocking overlay when needed.
 * Uses UsageEvents.Event.getClassName() for Settings screen detection
 * (WiFi, SubSettings, etc.) without needing the AccessibilityService proxy.
 */
class AppMonitorService(private val context: Context) {

    companion object {
        private const val TAG = "AppMonitorService"
        private const val POLL_INTERVAL_MS = 5L // Poll every 5ms for instant detection

        @Volatile
        var instance: AppMonitorService? = null
            private set
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private var isPaused = false // Paused while overlay is showing, resumes on dismiss
    private var overlayManager: BlockedOverlayManager? = null

    // Track whether user came from an allowed WiFi screen (for SubSettings navigation)
    private var lastAllowedWifiSettings = false

    // Callback to go home (will be set by whoever starts monitoring)
    var onGoHome: (() -> Unit)? = null

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring) return
            if (isPaused) return // Overlay is showing, wait for dismiss

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

        // Create overlay manager — resume polling when user taps to dismiss
        overlayManager = BlockedOverlayManager(context).apply {
            onDismissed = {
                onGoHome?.invoke()
                resumePolling()
            }
        }

        isMonitoring = true
        isPaused = false
        handler.post(monitorRunnable)
        Log.d(TAG, "Started monitoring with ${POLL_INTERVAL_MS}ms polling")
    }

    /**
     * Resume polling after overlay is dismissed
     */
    private fun resumePolling() {
        if (!isMonitoring) return
        isPaused = false
        Log.d(TAG, "Resuming polling after overlay dismiss")
        handler.post(monitorRunnable)
    }

    /**
     * Force an immediate check of the current foreground app using a wider time window.
     * Called when a new blocking session starts so that the currently open blocked app
     * gets blocked instantly (the normal 5-second event window may miss it if the user
     * has been in the app for a while without generating a new MOVE_TO_FOREGROUND event).
     */
    fun immediateBlockCheck() {
        Log.d(TAG, "immediateBlockCheck: checking with wide time window")

        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return

        val now = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(now - 60_000, now)
        val event = UsageEvents.Event()

        var foregroundPackage: String? = null
        var foregroundClassName: String? = null

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                foregroundPackage = event.packageName
                foregroundClassName = event.className
            }
        }

        if (foregroundPackage == null || foregroundPackage == "com.scuteapp") return
        if (!shouldBlockApp(foregroundPackage)) return
        if (isSettingsApp(foregroundPackage) && isAllowedSettingsScreen(foregroundClassName)) return

        Log.d(TAG, "immediateBlockCheck: BLOCKING $foregroundPackage")
        isPaused = true
        ScuteAccessibilityService.instance?.goHome()
        showBlockedOverlay(foregroundPackage)
    }

    /**
     * Stop monitoring
     */
    fun stopMonitoring() {
        isMonitoring = false
        isPaused = false
        handler.removeCallbacks(monitorRunnable)
        overlayManager?.dismiss()
        overlayManager = null
        instance = null
        Log.d(TAG, "Stopped monitoring")
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
     * Get the current foreground app package name and activity class name.
     * Returns Pair(packageName, className) or null if no foreground app detected.
     */
    private fun getForegroundApp(): Pair<String, String?>? {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return null

        val now = System.currentTimeMillis()
        val events = usageStatsManager.queryEvents(now - 5000, now)
        val event = UsageEvents.Event()

        var foregroundPackage: String? = null
        var foregroundClassName: String? = null

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                foregroundPackage = event.packageName
                foregroundClassName = event.className
            }
        }

        return if (foregroundPackage != null) Pair(foregroundPackage, foregroundClassName) else null
    }

    /**
     * Check foreground app and block if needed.
     * Simple: get foreground app → if blocked, go home + show overlay + pause polling.
     */
    private fun checkForegroundApp() {
        val result = getForegroundApp() ?: return
        val (currentPackage, currentClassName) = result

        // Skip our own app, but handle bubble re-show
        if (currentPackage == "com.scuteapp") {
            handleScuteAppEntered()
            return
        }

        // Reset WiFi settings flag when leaving settings
        if (!isSettingsApp(currentPackage)) {
            lastAllowedWifiSettings = false
        }

        // Check if this app should be blocked
        if (!shouldBlockApp(currentPackage)) return

        // For Settings apps, allow specific screens (WiFi, etc.)
        if (isSettingsApp(currentPackage) && isAllowedSettingsScreen(currentClassName)) return

        // Block it: go home, show overlay, pause polling until dismissed
        Log.d(TAG, "BLOCKING: pkg=$currentPackage, class=$currentClassName")
        isPaused = true
        ScuteAccessibilityService.instance?.goHome()
        showBlockedOverlay(currentPackage)
    }

    /**
     * Handle when user enters the Scute app — reset bubble visibility
     */
    private fun handleScuteAppEntered() {
        val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        val widgetBubbleDisabled = prefs.getBoolean("widget_bubble_disabled", false)
        val bubbleManager = FloatingBubbleManager.getInstance(context)
        if (!widgetBubbleDisabled) {
            bubbleManager.resetHidden()
        }
        if (!widgetBubbleDisabled && !bubbleManager.isShowing()) {
            val isSessionActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            if (isSessionActive) {
                val noTimeLimit = prefs.getBoolean("no_time_limit", false)
                try {
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
                    Log.e(TAG, "Failed to re-show bubble on app enter", e)
                }
            }
        }
    }

    /**
     * Check if a Settings screen className is allowed through blocking.
     * Allows WiFi settings and SubSettings navigated from WiFi.
     */
    private fun isAllowedSettingsScreen(className: String?): Boolean {
        if (className.isNullOrEmpty()) return false

        // Allow WiFi / Connections screens
        if (className.contains("WifiSettings", ignoreCase = true) ||
            className.contains("DeepLinkHomepageActivity", ignoreCase = true) ||
            className.contains("ConnectionsSettingsActivity", ignoreCase = true)) {
            lastAllowedWifiSettings = true
            return true
        }

        // Allow SubSettings if user navigated from WiFi
        if (className.contains("SubSettings", ignoreCase = true) && lastAllowedWifiSettings) {
            return true
        }

        // Any other Settings screen — not allowed
        lastAllowedWifiSettings = false
        return false
    }

    /**
     * Check if app should be blocked
     */
    private fun shouldBlockApp(packageName: String): Boolean {
        val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

        val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
        if (!isActive) return false

        val noTimeLimit = prefs.getBoolean("no_time_limit", false)
        val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
        if (!noTimeLimit && System.currentTimeMillis() > endTime) return false

        val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
        return blockedApps?.contains(packageName) == true
    }

    /**
     * Show blocking overlay
     */
    private fun showBlockedOverlay(packageName: String) {
        val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        val strictMode = prefs.getBoolean("strict_mode", true)
        val customBlockedText = prefs.getString("custom_blocked_text", "") ?: ""
        val customBlockedTextColor = prefs.getString("custom_blocked_text_color", "") ?: ""
        val customOverlayImage = prefs.getString("custom_overlay_image", "") ?: ""
        val customOverlayImageSize = prefs.getInt("custom_overlay_image_size", 120)

        Log.d(TAG, "showBlockedOverlay: pkg=$packageName, customBlockedText='$customBlockedText', customBlockedTextColor='$customBlockedTextColor', customOverlayImage='$customOverlayImage', customOverlayImageSize=$customOverlayImageSize")

        val blockedType = if (isSettingsApp(packageName)) {
            Log.d(TAG, "Detected settings app blocked: $packageName")
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
        val shown = overlayManager?.show(blockedType, packageName, appName, strictMode, customBlockedText, customBlockedTextColor, customOverlayImage, customOverlayImageSize) ?: false

        if (!shown) {
            Log.w(TAG, "Failed to show overlay, falling back to activity")
            // Fallback: launch BlockedActivity (no HOME action - just show activity)
            BlockedActivity.launchNoAnimation(context, blockedType, packageName, strictMode, customBlockedText, customBlockedTextColor, customOverlayImage, customOverlayImageSize)
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
