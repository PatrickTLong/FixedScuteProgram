package com.scuteapp

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray

/**
 * Accessibility Service - ONLY used for:
 * 1. Website blocking (needs to read browser URL bars)
 * 2. Uninstall protection (needs to detect uninstall dialogs)
 * 3. Scheduled preset activation
 * 4. Performing HOME action when overlay is dismissed
 *
 * App blocking is handled by AppMonitorService using UsageStats (faster, simpler).
 */
class ScuteAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "ScuteAccessibility"
        private const val SCHEDULE_CHECK_INTERVAL_MS = 5000L

        @Volatile
        var isRunning = false
            private set

        @Volatile
        var instance: ScuteAccessibilityService? = null
            private set

        // Browser URL bar IDs for website blocking
        private val BROWSER_URL_BAR_IDS = mapOf(
            // Chrome variants
            "com.android.chrome" to "com.android.chrome:id/url_bar",
            "com.chrome.beta" to "com.chrome.beta:id/url_bar",
            "com.chrome.dev" to "com.chrome.dev:id/url_bar",
            "com.chrome.canary" to "com.chrome.canary:id/url_bar",
            // Firefox variants
            "org.mozilla.firefox" to "org.mozilla.firefox:id/url_bar_title",
            "org.mozilla.firefox_beta" to "org.mozilla.firefox_beta:id/url_bar_title",
            "org.mozilla.fenix" to "org.mozilla.fenix:id/url_bar_title",
            "org.mozilla.focus" to "org.mozilla.focus:id/display_url",
            "org.mozilla.rocket" to "org.mozilla.rocket:id/display_url",
            // Opera variants
            "com.opera.browser" to "com.opera.browser:id/url_field",
            "com.opera.browser.beta" to "com.opera.browser.beta:id/url_field",
            "com.opera.mini.native" to "com.opera.mini.native:id/url_field",
            "com.opera.gx.gaming" to "com.opera.gx.gaming:id/url_field",
            // Brave
            "com.brave.browser" to "com.brave.browser:id/url_bar",
            "com.brave.browser_beta" to "com.brave.browser_beta:id/url_bar",
            "com.brave.browser_nightly" to "com.brave.browser_nightly:id/url_bar",
            // Microsoft Edge
            "com.microsoft.emmx" to "com.microsoft.emmx:id/url_bar",
            "com.microsoft.emmx.beta" to "com.microsoft.emmx.beta:id/url_bar",
            "com.microsoft.emmx.dev" to "com.microsoft.emmx.dev:id/url_bar",
            "com.microsoft.emmx.canary" to "com.microsoft.emmx.canary:id/url_bar",
            // Samsung Internet
            "com.sec.android.app.sbrowser" to "com.sec.android.app.sbrowser:id/location_bar_edit_text",
            "com.sec.android.app.sbrowser.beta" to "com.sec.android.app.sbrowser.beta:id/location_bar_edit_text",
            // DuckDuckGo
            "com.duckduckgo.mobile.android" to "com.duckduckgo.mobile.android:id/omnibarTextInput",
            // Vivaldi
            "com.vivaldi.browser" to "com.vivaldi.browser:id/url_bar",
            "com.vivaldi.browser.snapshot" to "com.vivaldi.browser.snapshot:id/url_bar",
            // Kiwi Browser (Chromium-based)
            "com.kiwibrowser.browser" to "com.kiwibrowser.browser:id/url_bar",
            // Ecosia
            "com.ecosia.android" to "com.ecosia.android:id/url_bar",
            // Yandex
            "com.yandex.browser" to "com.yandex.browser:id/bro_omnibar_address_title_text",
            "ru.yandex.searchplugin" to "ru.yandex.searchplugin:id/bro_omnibar_address_title_text",
            // UC Browser
            "com.UCMobile.intl" to "com.UCMobile.intl:id/url_edittext_container",
            // Puffin
            "com.cloudmosa.puffinFree" to "com.cloudmosa.puffinFree:id/addressbarEdit",
            "com.cloudmosa.puffin" to "com.cloudmosa.puffin:id/addressbarEdit",
            // Tor Browser
            "org.torproject.torbrowser" to "org.torproject.torbrowser:id/url_bar_title",
            // Bromite (privacy-focused Chromium)
            "org.bromite.bromite" to "org.bromite.bromite:id/url_bar",
            // Ungoogled Chromium
            "org.nicotine.nicotine" to "org.nicotine.nicotine:id/url_bar",
            // Flynx (floating browser)
            "com.nicework.flynx" to "com.nicework.flynx:id/url_text",
            // Whale (Naver)
            "com.naver.whale" to "com.naver.whale:id/url_bar",
            // Phoenix Browser
            "com.nicework.nicebrowser" to "com.nicework.nicebrowser:id/url_edit_text",
            // Via Browser
            "mark.via.gp" to "mark.via.gp:id/aw",
            // Mint Browser (Xiaomi)
            "com.mi.globalbrowser" to "com.mi.globalbrowser:id/url",
            "com.mi.globalbrowser.mini" to "com.mi.globalbrowser.mini:id/url"
        )

        private val BROWSER_PACKAGES = BROWSER_URL_BAR_IDS.keys
    }

    private var lastScheduleCheckTime = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        instance = this

        Log.d(TAG, "Accessibility service connected")
        checkAndActivateScheduledPresets()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val packageName = event.packageName?.toString() ?: return

        // Skip our own app
        if (packageName == "com.scuteapp") return

        // Check scheduled presets (throttled)
        val now = System.currentTimeMillis()
        if (now - lastScheduleCheckTime >= SCHEDULE_CHECK_INTERVAL_MS) {
            lastScheduleCheckTime = now
            checkAndActivateScheduledPresets()
        }

        // Block Scute uninstall attempts
        if (packageName.contains("packageinstaller") && isScuteUninstallDialog()) {
            Log.d(TAG, "BLOCKING Scute uninstall dialog")
            performGlobalAction(GLOBAL_ACTION_BACK)
            return
        }

        if ((packageName.contains("launcher") || packageName == "com.android.systemui") && isScuteUninstallOnLauncher()) {
            Log.d(TAG, "BLOCKING Scute uninstall on launcher")
            performGlobalAction(GLOBAL_ACTION_BACK)
            return
        }

        // INSTANT Settings blocking via Accessibility (faster than UsageStats polling)
        // Only handle Settings here; regular apps are handled by AppMonitorService
        if (isSettingsPackage(packageName) && shouldBlockSettings()) {
            Log.d(TAG, "BLOCKING Settings via Accessibility: $packageName")

            // Show blocked overlay INSTANTLY (before Settings renders)
            AppMonitorService.instance?.blockSettingsNow(packageName)

            // Also go back to close Settings underneath the overlay
            performGlobalAction(GLOBAL_ACTION_BACK)
        }

        // Website blocking is now handled by WebsiteMonitorService with fast polling
    }

    /**
     * Check if this is a Settings-related package
     */
    private fun isSettingsPackage(packageName: String): Boolean {
        return packageName == "com.android.settings" ||
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
               packageName == "com.sony.settings" ||
               packageName.contains("settings", ignoreCase = true)
    }

    /**
     * Check if Settings should be blocked right now
     */
    private fun shouldBlockSettings(): Boolean {
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

        // Check if session is active
        if (!prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)) {
            return false
        }

        // Check if session has expired
        val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
        if (System.currentTimeMillis() > endTime) {
            return false
        }

        // Check if any Settings package is in the blocked list
        val blockedApps = prefs.getStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, emptySet()) ?: emptySet()
        return blockedApps.any { isSettingsPackage(it) }
    }

    private fun isScuteUninstallDialog(): Boolean {
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)) return false
        if (System.currentTimeMillis() > prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)) return false

        return try {
            val rootNode = rootInActiveWindow ?: return false
            val hasScute = findTextInTree(rootNode, listOf("scute"))
            val hasUninstall = findTextInTree(rootNode, listOf("uninstall", "deinstallieren", "désinstaller", "desinstalar"))
            rootNode.recycle()
            hasScute && hasUninstall
        } catch (e: Exception) {
            false
        }
    }

    private fun isScuteUninstallOnLauncher(): Boolean {
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)) return false
        if (System.currentTimeMillis() > prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)) return false

        return try {
            val rootNode = rootInActiveWindow ?: return false
            val hasScute = findTextInTree(rootNode, listOf("scute"))
            val hasUninstall = findTextInTree(rootNode, listOf("uninstall", "deinstallieren", "désinstaller", "desinstalar", "disinstalla"))
            rootNode.recycle()
            hasScute && hasUninstall
        } catch (e: Exception) {
            false
        }
    }

    private fun findTextInTree(node: AccessibilityNodeInfo?, keywords: List<String>): Boolean {
        if (node == null) return false
        val text = node.text?.toString()?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.lowercase() ?: ""

        for (keyword in keywords) {
            if (text.contains(keyword) || contentDesc.contains(keyword)) return true
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

    // Schedule management
    private fun checkAndActivateScheduledPresets() {
        try {
            val schedulePrefs = getSharedPreferences(ScheduleManager.PREFS_NAME, Context.MODE_PRIVATE)
            val presetsJson = schedulePrefs.getString(ScheduleManager.KEY_SCHEDULED_PRESETS, null)

            if (presetsJson.isNullOrEmpty()) {
                checkAndDeactivateExpiredSchedule()
                return
            }

            val presetsArray = JSONArray(presetsJson)
            val now = System.currentTimeMillis()

            for (i in 0 until presetsArray.length()) {
                val preset = presetsArray.getJSONObject(i)
                val presetId = preset.getString("id")
                val isActive = preset.optBoolean("isActive", false)
                val isScheduled = preset.optBoolean("isScheduled", false)
                val startDate = preset.optString("scheduleStartDate", null)
                val endDate = preset.optString("scheduleEndDate", null)

                if (!isActive || !isScheduled || startDate.isNullOrEmpty() || endDate.isNullOrEmpty()) continue

                val startTime = parseIsoDate(startDate)
                val endTime = parseIsoDate(endDate)

                if (now >= startTime && now < endTime) {
                    val sessionPrefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
                    val currentActiveId = sessionPrefs.getString("active_preset_id", null)
                    val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)

                    if (isSessionActive && currentActiveId == presetId) return

                    activateScheduledPreset(preset, presetId, endTime)
                    return
                }
            }

            checkAndDeactivateExpiredSchedule()
        } catch (e: Exception) {
            Log.e(TAG, "Error checking scheduled presets", e)
        }
    }

    private fun checkAndDeactivateExpiredSchedule() {
        try {
            val sessionPrefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
            val isSessionActive = sessionPrefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
            val activePresetId = sessionPrefs.getString("active_preset_id", null)

            if (!isSessionActive || activePresetId == null) return

            val endTime = sessionPrefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
            if (System.currentTimeMillis() >= endTime) {
                sessionPrefs.edit()
                    .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
                    .remove("active_preset_id")
                    .remove("active_preset_name")
                    .apply()
                stopService(Intent(this, UninstallBlockerService::class.java))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking for expired schedule", e)
        }
    }

    private fun activateScheduledPreset(preset: org.json.JSONObject, presetId: String, endTime: Long) {
        try {
            val mode = preset.optString("mode", "specific")
            val selectedApps = mutableSetOf<String>()
            val blockedWebsites = mutableSetOf<String>()

            val appsArray = preset.optJSONArray("selectedApps")
            if (appsArray != null) {
                for (i in 0 until appsArray.length()) {
                    selectedApps.add(appsArray.getString(i))
                }
            }

            if (mode == "all") {
                try {
                    val pm = packageManager
                    val mainIntent = Intent(Intent.ACTION_MAIN, null).apply { addCategory(Intent.CATEGORY_LAUNCHER) }
                    val resolvedInfos = pm.queryIntentActivities(mainIntent, 0)
                    for (resolveInfo in resolvedInfos) {
                        val packageName = resolveInfo.activityInfo.packageName
                        if (packageName != "com.scuteapp") selectedApps.add(packageName)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to get installed apps", e)
                }
            }

            val websitesArray = preset.optJSONArray("blockedWebsites")
            if (websitesArray != null) {
                for (i in 0 until websitesArray.length()) {
                    blockedWebsites.add(websitesArray.getString(i))
                }
            }

            if (preset.optBoolean("blockSettings", false)) {
                selectedApps.addAll(listOf(
                    "com.android.settings",
                    "com.samsung.android.settings",
                    "com.samsung.android.setting.multisoundmain",
                    "com.miui.securitycenter",
                    "com.coloros.settings",
                    "com.oppo.settings",
                    "com.vivo.settings",
                    "com.huawei.systemmanager",
                    "com.oneplus.settings",
                    "com.google.android.settings.intelligence",
                    "com.android.provision",
                    "com.lge.settings",
                    "com.asus.settings",
                    "com.sony.settings"
                ))
            }

            selectedApps.remove("com.scuteapp")

            val noTimeLimit = preset.optBoolean("noTimeLimit", false)
            val finalEndTime = if (noTimeLimit) System.currentTimeMillis() + Long.MAX_VALUE / 2 else endTime

            val sessionPrefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
            sessionPrefs.edit()
                .putStringSet(UninstallBlockerService.KEY_BLOCKED_APPS, selectedApps)
                .putStringSet("blocked_websites", blockedWebsites)
                .putBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, true)
                .putLong(UninstallBlockerService.KEY_SESSION_END_TIME, finalEndTime)
                .putBoolean("no_time_limit", noTimeLimit)
                .putString("active_preset_id", presetId)
                .putString("active_preset_name", preset.optString("name", "Scheduled Preset"))
                .apply()

            val serviceIntent = Intent(this, UninstallBlockerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            Log.d(TAG, "Scheduled preset activated: ${preset.optString("name")}")
        } catch (e: Exception) {
            Log.e(TAG, "Error activating scheduled preset", e)
        }
    }

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
                System.currentTimeMillis()
            }
        }
    }

    // Public methods
    fun goHome() = performGlobalAction(GLOBAL_ACTION_HOME)
    fun pressBack() = performGlobalAction(GLOBAL_ACTION_BACK)
    fun onOverlayDismissed() = performGlobalAction(GLOBAL_ACTION_HOME)

    /**
     * Navigate to a URL in the current browser by sending a VIEW intent
     * to the same browser package. This opens the URL in the current browser
     * and replaces the current tab in most browsers.
     */
    fun navigateToUrl(url: String): Boolean {
        return try {
            val rootNode = rootInActiveWindow ?: return false
            val packageName = rootNode.packageName?.toString()
            rootNode.recycle()

            if (packageName == null || !BROWSER_PACKAGES.contains(packageName)) {
                return false
            }

            // Create intent to open URL in the same browser
            val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)).apply {
                setPackage(packageName) // Open in the same browser
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP) // This helps replace current tab
            }

            startActivity(intent)
            Log.d(TAG, "Navigated to $url in $packageName")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error navigating to URL", e)
            false
        }
    }

    /**
     * Get the current browser URL if a browser is in the foreground.
     * Called by WebsiteMonitorService for fast polling.
     * Returns Pair(packageName, url) or null if not in a browser or can't get URL.
     */
    fun getCurrentBrowserUrl(): Pair<String, String>? {
        return try {
            val rootNode = rootInActiveWindow ?: return null
            val packageName = rootNode.packageName?.toString()

            if (packageName == null || !BROWSER_PACKAGES.contains(packageName)) {
                rootNode.recycle()
                return null
            }

            // Check if URL bar is focused (user is typing)
            val urlBarId = BROWSER_URL_BAR_IDS[packageName]
            if (urlBarId != null) {
                val urlNodes = rootNode.findAccessibilityNodeInfosByViewId(urlBarId)
                val urlNode = urlNodes.firstOrNull()

                if (urlNode != null) {
                    // Skip if URL bar is focused (user is typing)
                    if (urlNode.isFocused) {
                        urlNodes.forEach { it.recycle() }
                        rootNode.recycle()
                        return null
                    }

                    val url = urlNode.text?.toString()
                    urlNodes.forEach { it.recycle() }
                    rootNode.recycle()

                    // Validate URL
                    if (url.isNullOrEmpty() || url.length < 4 || !url.contains(".") || url.contains(" ")) {
                        return null
                    }

                    return Pair(packageName, url)
                }

                urlNodes.forEach { it.recycle() }
            }

            rootNode.recycle()
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error getting browser URL", e)
            null
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
}
