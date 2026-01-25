package com.scuteapp

import android.accessibilityservice.AccessibilityService
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.app.NotificationCompat
import org.json.JSONArray

/**
 * Accessibility Service for monitoring and blocking apps and websites.
 * This service monitors app launches and browser URLs to block restricted content.
 *
 * IMPORTANT: This service also handles scheduled preset activation by checking
 * the schedule on every window change event. This ensures schedules work even
 * when the app is closed (swiped away), since the Accessibility Service runs
 * independently of the React Native app process.
 */
class ScuteAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "ScuteAccessibility"

        // Throttle schedule checks to avoid excessive processing
        private const val SCHEDULE_CHECK_INTERVAL_MS = 5000L // Check every 5 seconds max

        // Packages that should NEVER be blocked
        private val EXCLUDED_PACKAGES = setOf(
            "com.bind" // Our own app - never block
        )

        @Volatile
        var isRunning = false
            private set

        @Volatile
        var instance: ScuteAccessibilityService? = null
            private set

        // Known browser packages and their URL bar IDs
        private val BROWSER_URL_BAR_IDS = mapOf(
            "com.android.chrome" to "com.android.chrome:id/url_bar",
            "com.chrome.beta" to "com.chrome.beta:id/url_bar",
            "com.chrome.dev" to "com.chrome.dev:id/url_bar",
            "com.chrome.canary" to "com.chrome.canary:id/url_bar",
            "org.mozilla.firefox" to "org.mozilla.firefox:id/url_bar_title",
            "org.mozilla.firefox_beta" to "org.mozilla.firefox_beta:id/url_bar_title",
            "com.opera.browser" to "com.opera.browser:id/url_field",
            "com.opera.mini.native" to "com.opera.mini.native:id/url_field",
            "com.brave.browser" to "com.brave.browser:id/url_bar",
            "com.microsoft.emmx" to "com.microsoft.emmx:id/url_bar",
            "com.sec.android.app.sbrowser" to "com.sec.android.app.sbrowser:id/location_bar_edit_text",
            "com.duckduckgo.mobile.android" to "com.duckduckgo.mobile.android:id/omnibarTextInput"
        )

        private val BROWSER_PACKAGES = BROWSER_URL_BAR_IDS.keys
    }

    // Instance variable to throttle schedule checks
    private var lastScheduleCheckTime = 0L

    // Simple throttle - minimum time between overlay launches
    private var lastOverlayLaunchTime = 0L
    private val OVERLAY_THROTTLE_MS = 800L

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        instance = this
        Log.d(TAG, "Accessibility service connected and RUNNING")

        // Log current blocking state
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
        val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
        Log.d(TAG, "Current blocking state: isActive=$isActive, blockedAppsCount=${blockedApps?.size ?: 0}")

        // Check scheduled presets immediately when service connects
        // This handles the case where app was closed but schedule should be active
        checkAndActivateScheduledPresets()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return

        // Skip our own app and any excluded packages
        if (EXCLUDED_PACKAGES.contains(packageName)) {
            return
        }

        // CRITICAL: Check scheduled presets on every window change (throttled)
        // This ensures schedules work even when the app is closed/swiped away
        // The Accessibility Service runs independently of the React Native app
        val now = System.currentTimeMillis()
        if (now - lastScheduleCheckTime >= SCHEDULE_CHECK_INTERVAL_MS) {
            lastScheduleCheckTime = now
            checkAndActivateScheduledPresets()
        }

        // Block uninstall of Scute app while session is active
        if (packageName == "com.google.android.packageinstaller" ||
            packageName == "com.android.packageinstaller" ||
            packageName == "com.samsung.android.packageinstaller" ||
            packageName.contains("packageinstaller")) {
            if (isScuteUninstallDialog()) {
                Log.d(TAG, "BLOCKING Scute uninstall dialog")
                performGlobalAction(GLOBAL_ACTION_BACK)
                return
            }
        }

        // Check for launcher trying to uninstall Scute
        if (packageName.contains("launcher") ||
            packageName == "com.android.launcher" ||
            packageName == "com.android.launcher3" ||
            packageName == "com.google.android.apps.nexuslauncher" ||
            packageName == "com.sec.android.app.launcher" ||
            packageName == "com.miui.home" ||
            packageName == "com.oppo.launcher" ||
            packageName == "com.vivo.launcher" ||
            packageName == "com.android.systemui") {
            if (isScuteUninstallOnLauncher()) {
                Log.d(TAG, "BLOCKING Scute uninstall on launcher")
                performGlobalAction(GLOBAL_ACTION_BACK)
                return
            }
        }

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                Log.d(TAG, "Window changed to: $packageName")

                // Check if this app should be blocked
                if (shouldBlockApp(packageName)) {
                    Log.d(TAG, "BLOCKING app: $packageName")
                    // DEBUG: Log the full blocked apps list when blocking occurs
                    val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
                    val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
                    Log.d(TAG, "DEBUG - Full blocked apps list: $blockedApps")

                    // Show blocking overlay
                    val blockedType = if (isSettingsApp(packageName)) {
                        BlockedActivity.TYPE_SETTINGS
                    } else {
                        BlockedActivity.TYPE_APP
                    }
                    showBlockedOverlay(blockedType)
                    return
                }

                // If it's a browser, check the URL (only on window state change = page loaded)
                if (BROWSER_PACKAGES.contains(packageName)) {
                    checkBrowserUrl(packageName, isPageLoad = true)
                }
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                // For content changes, only check if it looks like navigation completed
                if (BROWSER_PACKAGES.contains(packageName)) {
                    checkBrowserUrl(packageName, isPageLoad = false)
                }

                // Also check if Settings should be blocked
                if (isSettingsApp(packageName) && shouldBlockApp(packageName)) {
                    Log.d(TAG, "BLOCKING settings app on content change: $packageName")
                    showBlockedOverlay(BlockedActivity.TYPE_SETTINGS)
                    return
                }
            }
        }
    }

    private var lastBlockedUrl: String? = null
    private var lastBlockTime: Long = 0
    private var lastUrlBarFocusCheck: Long = 0

    private fun checkBrowserUrl(packageName: String, isPageLoad: Boolean) {
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

        // Check if session is active
        val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
        if (!isActive) return

        // Check if session has expired
        val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
        if (System.currentTimeMillis() > endTime) return

        // Get blocked websites
        val blockedWebsites = prefs.getStringSet("blocked_websites", emptySet()) ?: emptySet()
        if (blockedWebsites.isEmpty()) return

        // Check if URL bar is focused (user is typing) - skip blocking if so
        if (isUrlBarFocused(packageName)) {
            Log.d(TAG, "URL bar is focused, skipping block check")
            return
        }

        // Try to get URL from the browser
        val url = getBrowserUrl(packageName)
        if (url.isNullOrEmpty()) return

        // Skip if URL is too short
        if (url.length < 4) return

        // Skip if URL doesn't look like a complete domain
        if (!url.contains(".") || url.endsWith(".")) return

        // Skip if URL looks like a search query (contains spaces or no TLD pattern)
        if (url.contains(" ")) return

        // Check if URL matches any blocked website
        for (blockedSite in blockedWebsites) {
            if (urlMatchesDomain(url, blockedSite)) {
                // Debounce: don't block the same URL repeatedly within 2 seconds
                val now = System.currentTimeMillis()
                if (url == lastBlockedUrl && now - lastBlockTime < 2000) {
                    return
                }

                Log.d(TAG, "BLOCKING website: $blockedSite (URL: $url)")
                lastBlockedUrl = url
                lastBlockTime = now

                // Show blocking overlay for website
                showBlockedOverlay(BlockedActivity.TYPE_WEBSITE)
                return
            }
        }
    }

    private fun isUrlBarFocused(packageName: String): Boolean {
        try {
            val rootNode = rootInActiveWindow ?: return false
            val urlBarId = BROWSER_URL_BAR_IDS[packageName]

            if (urlBarId != null) {
                val urlNodes = rootNode.findAccessibilityNodeInfosByViewId(urlBarId)
                if (urlNodes.isNotEmpty()) {
                    val isFocused = urlNodes[0].isFocused
                    urlNodes.forEach { it.recycle() }
                    rootNode.recycle()
                    return isFocused
                }
            }
            rootNode.recycle()
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error checking URL bar focus", e)
            return false
        }
    }

    /**
     * Check if uninstall dialog is for Scute app
     */
    private fun isScuteUninstallDialog(): Boolean {
        try {
            val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

            val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            if (!isActive) return false

            val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            if (System.currentTimeMillis() > endTime) return false

            val rootNode = rootInActiveWindow ?: return false

            // Check if "scute" appears in the uninstall dialog
            val hasScute = findTextInTree(rootNode, listOf("scute"))
            val hasUninstall = findTextInTree(rootNode, listOf("uninstall", "deinstallieren", "désinstaller", "desinstalar"))

            rootNode.recycle()
            return hasScute && hasUninstall
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Scute uninstall dialog", e)
            return false
        }
    }

    /**
     * Check if launcher is showing uninstall option for Scute
     */
    private fun isScuteUninstallOnLauncher(): Boolean {
        try {
            val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

            val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            if (!isActive) return false

            val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            if (System.currentTimeMillis() > endTime) return false

            val rootNode = rootInActiveWindow ?: return false

            // Check if "scute" appears with uninstall option
            // Note: Don't use generic words like "remove" as they appear in many apps (e.g., "Remove formatting" in Notes)
            val hasScute = findTextInTree(rootNode, listOf("scute"))
            val hasUninstall = findTextInTree(rootNode, listOf("uninstall", "deinstallieren", "désinstaller", "desinstalar", "disinstalla"))

            rootNode.recycle()
            return hasScute && hasUninstall
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Scute uninstall on launcher", e)
            return false
        }
    }

    private fun findTextInTree(node: AccessibilityNodeInfo?, keywords: List<String>): Boolean {
        if (node == null) return false

        val text = node.text?.toString()?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.lowercase() ?: ""

        for (keyword in keywords) {
            if (text.contains(keyword) || contentDesc.contains(keyword)) {
                return true
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (findTextInTree(child, keywords)) {
                child?.recycle()
                return true
            }
            child?.recycle()
        }

        return false
    }

    private fun getBrowserUrl(packageName: String): String? {
        try {
            val rootNode = rootInActiveWindow ?: return null
            val urlBarId = BROWSER_URL_BAR_IDS[packageName]

            // Try to find URL bar by resource ID
            if (urlBarId != null) {
                val urlNodes = rootNode.findAccessibilityNodeInfosByViewId(urlBarId)
                if (urlNodes.isNotEmpty()) {
                    val url = urlNodes[0].text?.toString()
                    urlNodes.forEach { it.recycle() }
                    rootNode.recycle()
                    return url
                }
            }

            // Fallback: search for EditText with URL-like content
            val url = findUrlInNode(rootNode)
            rootNode.recycle()
            return url
        } catch (e: Exception) {
            Log.e(TAG, "Error getting browser URL", e)
            return null
        }
    }

    private fun findUrlInNode(node: AccessibilityNodeInfo?): String? {
        if (node == null) return null

        // Check if this node has URL-like text
        val text = node.text?.toString()
        if (text != null && (text.contains(".com") || text.contains(".org") ||
            text.contains(".net") || text.contains("www.") || text.contains("https://"))) {
            return text
        }

        // Recursively check children
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val url = findUrlInNode(child)
            child?.recycle()
            if (url != null) return url
        }

        return null
    }

    private fun urlMatchesDomain(url: String, blockedDomain: String): Boolean {
        val normalizedUrl = url.lowercase()
            .removePrefix("https://")
            .removePrefix("http://")
            .removePrefix("www.")

        val normalizedDomain = blockedDomain.lowercase()
            .removePrefix("https://")
            .removePrefix("http://")
            .removePrefix("www.")

        // Check if URL starts with or contains the blocked domain
        return normalizedUrl.startsWith(normalizedDomain) ||
               normalizedUrl.contains(".$normalizedDomain") ||
               normalizedUrl.contains("/$normalizedDomain")
    }

    private fun shouldBlockApp(packageName: String): Boolean {
        // Never block excluded packages (our own app, etc.)
        if (EXCLUDED_PACKAGES.contains(packageName)) {
            return false
        }

        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

        // Check if session is active
        val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
        if (!isActive) {
            Log.d(TAG, "shouldBlockApp($packageName): session NOT active")
            return false
        }

        // Check if session has expired
        val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
        if (System.currentTimeMillis() > endTime) {
            Log.d(TAG, "shouldBlockApp($packageName): session EXPIRED (endTime=$endTime, now=${System.currentTimeMillis()})")
            return false
        }

        // Check if this package is in the blocked list
        val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet())
        val isBlocked = blockedApps?.contains(packageName) == true
        Log.d(TAG, "shouldBlockApp($packageName): isBlocked=$isBlocked, blockedAppsCount=${blockedApps?.size ?: 0}")

        // Special case: Allow WiFi settings even if Settings app is blocked
        if (isBlocked && isSettingsApp(packageName)) {
            if (isOnWifiSettings()) {
                Log.d(TAG, "Allowing WiFi settings page")
                return false
            }
        }

        return isBlocked
    }

    /**
     * Show the blocking overlay activity.
     * Sequence: back x3 -> home -> overlay
     */
    private fun showBlockedOverlay(blockedType: String) {
        val now = System.currentTimeMillis()

        // Simple throttle to prevent rapid-fire overlays
        if (now - lastOverlayLaunchTime < OVERLAY_THROTTLE_MS) {
            Log.d(TAG, "Overlay throttled, skipping")
            return
        }
        lastOverlayLaunchTime = now

        Log.d(TAG, "Launching BlockedActivity with type: $blockedType")

        // Back presses first (0, 100, 200ms)
        performGlobalAction(GLOBAL_ACTION_BACK)

        val handler = android.os.Handler(android.os.Looper.getMainLooper())

        handler.postDelayed({
            performGlobalAction(GLOBAL_ACTION_BACK)
        }, 100L)

        handler.postDelayed({
            performGlobalAction(GLOBAL_ACTION_BACK)
        }, 200L)

        // Home after back presses complete (350ms)
        handler.postDelayed({
            performGlobalAction(GLOBAL_ACTION_HOME)
        }, 350L)

        // Overlay after home (450ms)
        handler.postDelayed({
            BlockedActivity.launchNoAnimation(this, blockedType)
            lastOverlayLaunchTime = System.currentTimeMillis()
        }, 450L)
    }

    /**
     * Called when overlay is dismissed - go home
     */
    fun onOverlayDismissed() {
        Log.d(TAG, "Overlay dismissed")
        performGlobalAction(GLOBAL_ACTION_HOME)
    }

    private fun isSettingsApp(packageName: String): Boolean {
        // Only match actual system settings apps by exact package names
        // Do NOT use contains("settings") as it matches unrelated apps like notes apps
        return packageName == "com.android.settings" ||
               packageName == "com.samsung.android.settings" ||
               packageName == "com.miui.securitycenter" ||
               packageName == "com.coloros.settings" ||
               packageName == "com.oppo.settings" ||
               packageName == "com.vivo.settings" ||
               packageName == "com.huawei.systemmanager" ||
               packageName == "com.oneplus.settings" ||
               packageName == "com.google.android.settings.intelligence"
    }

    private fun isOnWifiSettings(): Boolean {
        try {
            val rootNode = rootInActiveWindow ?: return false

            // Look for WiFi-related text that indicates we're on the WiFi settings page
            val wifiKeywords = listOf(
                "wi-fi", "wifi", "wlan", "wireless",
                "available networks", "saved networks",
                "connected", "add network"
            )

            val isWifiPage = findTextInTree(rootNode, wifiKeywords)
            rootNode.recycle()

            return isWifiPage
        } catch (e: Exception) {
            Log.e(TAG, "Error checking WiFi settings", e)
            return false
        }
    }

    /**
     * Check scheduled presets and activate/deactivate based on current time.
     * This is the key function that makes schedules work even when the app is closed.
     *
     * How it works:
     * 1. Read scheduled presets from SharedPreferences (synced from React Native)
     * 2. Check if current time falls within any active schedule window
     * 3. If yes and not already blocking, activate the preset (start blocking)
     * 4. If no active schedule and we were blocking from a schedule, deactivate
     */
    private fun checkAndActivateScheduledPresets() {
        try {
            val schedulePrefs = getSharedPreferences(ScheduleManager.PREFS_NAME, Context.MODE_PRIVATE)
            val presetsJson = schedulePrefs.getString(ScheduleManager.KEY_SCHEDULED_PRESETS, null)

            if (presetsJson.isNullOrEmpty()) {
                // No scheduled presets, check if we need to deactivate a scheduled session
                checkAndDeactivateExpiredSchedule()
                return
            }

            val presetsArray = JSONArray(presetsJson)
            val now = System.currentTimeMillis()
            var foundActiveSchedule = false

            for (i in 0 until presetsArray.length()) {
                val preset = presetsArray.getJSONObject(i)
                val presetId = preset.getString("id")
                val isActive = preset.optBoolean("isActive", false)
                val isScheduled = preset.optBoolean("isScheduled", false)
                val startDate = if (preset.has("scheduleStartDate") && !preset.isNull("scheduleStartDate"))
                    preset.getString("scheduleStartDate") else null
                val endDate = if (preset.has("scheduleEndDate") && !preset.isNull("scheduleEndDate"))
                    preset.getString("scheduleEndDate") else null

                // Skip if not active or not scheduled
                if (!isActive || !isScheduled || startDate.isNullOrEmpty() || endDate.isNullOrEmpty()) {
                    continue
                }

                val startTime = parseIsoDate(startDate)
                val endTime = parseIsoDate(endDate)

                // Check if we're currently within the schedule window
                if (now >= startTime && now < endTime) {
                    foundActiveSchedule = true

                    // Check if this preset is already active
                    val sessionPrefs = getSharedPreferences(
                        UninstallBlockerService.PREFS_NAME,
                        Context.MODE_PRIVATE
                    )
                    val currentActiveId = sessionPrefs.getString("active_preset_id", null)
                    val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)

                    if (isSessionActive && currentActiveId == presetId) {
                        // Already active, nothing to do
                        Log.d(TAG, "Schedule check: Preset $presetId already active")
                        return
                    }

                    // Activate this preset!
                    Log.d(TAG, "Schedule check: Activating preset ${preset.optString("name")} (within schedule window)")
                    activateScheduledPreset(preset, presetId, endTime)
                    return
                }
            }

            // No active schedule found, check if we need to deactivate
            if (!foundActiveSchedule) {
                checkAndDeactivateExpiredSchedule()
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error checking scheduled presets", e)
        }
    }

    /**
     * Check if current session was from a schedule and has expired
     */
    private fun checkAndDeactivateExpiredSchedule() {
        try {
            val sessionPrefs = getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val activePresetId = sessionPrefs.getString("active_preset_id", null)

            // Only deactivate if there's an active session that was from a scheduled preset
            if (!isSessionActive || activePresetId == null) {
                return
            }

            // Check if session has expired based on end time
            val endTime = sessionPrefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            if (System.currentTimeMillis() >= endTime) {
                Log.d(TAG, "Schedule check: Session expired, deactivating")
                deactivateSession(sessionPrefs)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error checking for expired schedule", e)
        }
    }

    /**
     * Activate a scheduled preset - start blocking
     */
    private fun activateScheduledPreset(preset: org.json.JSONObject, presetId: String, endTime: Long) {
        try {
            val mode = preset.optString("mode", "specific")
            val selectedApps = mutableSetOf<String>()
            val blockedWebsites = mutableSetOf<String>()

            // Get selected apps
            val appsArray = preset.optJSONArray("selectedApps")
            if (appsArray != null) {
                for (i in 0 until appsArray.length()) {
                    selectedApps.add(appsArray.getString(i))
                }
            }

            // Handle "all" mode - block all installed apps
            if (mode == "all") {
                try {
                    val pm = packageManager
                    val mainIntent = Intent(Intent.ACTION_MAIN, null)
                    mainIntent.addCategory(Intent.CATEGORY_LAUNCHER)
                    val resolvedInfos = pm.queryIntentActivities(mainIntent, 0)

                    for (resolveInfo in resolvedInfos) {
                        val packageName = resolveInfo.activityInfo.packageName
                        if (packageName != "com.bind") {
                            selectedApps.add(packageName)
                        }
                    }
                    Log.d(TAG, "Mode 'all': blocking ${selectedApps.size} apps")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to get installed apps for 'all' mode", e)
                }
            }

            // Get blocked websites
            val websitesArray = preset.optJSONArray("blockedWebsites")
            if (websitesArray != null) {
                for (i in 0 until websitesArray.length()) {
                    blockedWebsites.add(websitesArray.getString(i))
                }
            }

            // Add settings packages if blockSettings is enabled
            val blockSettings = preset.optBoolean("blockSettings", false)
            if (blockSettings) {
                selectedApps.add("com.android.settings")
                selectedApps.add("com.samsung.android.settings")
                selectedApps.add("com.miui.securitycenter")
                selectedApps.add("com.coloros.settings")
                selectedApps.add("com.oppo.settings")
                selectedApps.add("com.vivo.settings")
                selectedApps.add("com.huawei.systemmanager")
                selectedApps.add("com.oneplus.settings")
                selectedApps.add("com.google.android.settings.intelligence")
            }

            // IMPORTANT: Remove any excluded packages (like our own app)
            selectedApps.removeAll(EXCLUDED_PACKAGES)

            // Calculate end time
            val noTimeLimit = preset.optBoolean("noTimeLimit", false)
            val finalEndTime = if (noTimeLimit) {
                System.currentTimeMillis() + Long.MAX_VALUE / 2
            } else {
                endTime
            }

            // Save session to SharedPreferences
            val sessionPrefs = getSharedPreferences(
                UninstallBlockerService.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            sessionPrefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, selectedApps)
                .putStringSet("blocked_websites", blockedWebsites)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, finalEndTime)
                .putBoolean("no_time_limit", noTimeLimit)
                .putString("active_preset_id", presetId)
                .putString("active_preset_name", preset.optString("name", "Scheduled Preset"))
                .apply()

            // Start the foreground service
            val serviceIntent = Intent(this, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            Log.d(TAG, "Scheduled preset activated via AccessibilityService: ${preset.optString("name")}")

        } catch (e: Exception) {
            Log.e(TAG, "Error activating scheduled preset", e)
        }
    }

    /**
     * Deactivate the current session
     */
    private fun deactivateSession(sessionPrefs: SharedPreferences) {
        try {
            sessionPrefs.edit()
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                .remove("active_preset_id")
                .remove("active_preset_name")
                .apply()

            // Stop the foreground service
            val serviceIntent = Intent(this, UninstallBlockerService::class.java)
            stopService(serviceIntent)

            Log.d(TAG, "Session deactivated via AccessibilityService")

        } catch (e: Exception) {
            Log.e(TAG, "Error deactivating session", e)
        }
    }

    /**
     * Parse ISO 8601 date string to milliseconds
     */
    private fun parseIsoDate(isoDate: String): Long {
        return try {
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.parse(isoDate)?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            try {
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).apply {
                    timeZone = java.util.TimeZone.getTimeZone("UTC")
                }.parse(isoDate)?.time ?: System.currentTimeMillis()
            } catch (e2: Exception) {
                Log.e(TAG, "Failed to parse date: $isoDate", e2)
                System.currentTimeMillis()
            }
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted")
    }

    override fun onDestroy() {
        isRunning = false
        instance = null
        Log.d(TAG, "Accessibility service destroyed")
        super.onDestroy()
    }

    /**
     * Press back button multiple times with delay between presses
     */
    fun spamBackButton(times: Int = 3) {
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        for (i in 0 until times) {
            handler.postDelayed({
                performGlobalAction(GLOBAL_ACTION_BACK)
            }, i * 150L) // 150ms delay between each press
        }
    }

    /**
     * Clear recent apps from view
     */
    fun clearRecents() {
        performGlobalAction(GLOBAL_ACTION_RECENTS)
        // Small delay then back
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            performGlobalAction(GLOBAL_ACTION_BACK)
        }, 200)
    }

    /**
     * Go to home screen
     */
    fun goHome() {
        performGlobalAction(GLOBAL_ACTION_HOME)
    }
}