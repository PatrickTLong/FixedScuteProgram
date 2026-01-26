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

    private var lastScheduleCheckTime = 0L
    private var lastBlockedUrl: String? = null
    private var lastBlockTime: Long = 0
    private var overlayManager: BlockedOverlayManager? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        instance = this

        // Create overlay manager for website blocking
        overlayManager = BlockedOverlayManager(this).apply {
            onDismissed = { performGlobalAction(GLOBAL_ACTION_HOME) }
        }

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

        // Website blocking (browsers only)
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (BROWSER_PACKAGES.contains(packageName)) {
                checkBrowserUrl(packageName)
            }
        }
    }

    private fun checkBrowserUrl(packageName: String) {
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

        if (!prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)) return
        if (System.currentTimeMillis() > prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)) return

        val blockedWebsites = prefs.getStringSet("blocked_websites", emptySet()) ?: emptySet()
        if (blockedWebsites.isEmpty()) return

        if (isUrlBarFocused(packageName)) return

        val url = getBrowserUrl(packageName)
        if (url.isNullOrEmpty() || url.length < 4 || !url.contains(".") || url.contains(" ")) return

        for (blockedSite in blockedWebsites) {
            if (urlMatchesDomain(url, blockedSite)) {
                val now = System.currentTimeMillis()
                if (url == lastBlockedUrl && now - lastBlockTime < 2000) return

                Log.d(TAG, "BLOCKING website: $blockedSite")
                lastBlockedUrl = url
                lastBlockTime = now

                val strictMode = prefs.getBoolean("strict_mode", true)
                overlayManager?.show(BlockedOverlayManager.TYPE_WEBSITE, blockedSite, strictMode)
                return
            }
        }
    }

    private fun isUrlBarFocused(packageName: String): Boolean {
        return try {
            val rootNode = rootInActiveWindow ?: return false
            val urlBarId = BROWSER_URL_BAR_IDS[packageName] ?: return false
            val urlNodes = rootNode.findAccessibilityNodeInfosByViewId(urlBarId)
            val isFocused = urlNodes.firstOrNull()?.isFocused == true
            urlNodes.forEach { it.recycle() }
            rootNode.recycle()
            isFocused
        } catch (e: Exception) {
            false
        }
    }

    private fun getBrowserUrl(packageName: String): String? {
        return try {
            val rootNode = rootInActiveWindow ?: return null
            val urlBarId = BROWSER_URL_BAR_IDS[packageName]
            if (urlBarId != null) {
                val urlNodes = rootNode.findAccessibilityNodeInfosByViewId(urlBarId)
                val url = urlNodes.firstOrNull()?.text?.toString()
                urlNodes.forEach { it.recycle() }
                rootNode.recycle()
                url
            } else {
                rootNode.recycle()
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun urlMatchesDomain(url: String, blockedDomain: String): Boolean {
        val normalizedUrl = url.lowercase().removePrefix("https://").removePrefix("http://").removePrefix("www.")
        val normalizedDomain = blockedDomain.lowercase().removePrefix("https://").removePrefix("http://").removePrefix("www.")
        return normalizedUrl.startsWith(normalizedDomain) || normalizedUrl.contains(".$normalizedDomain")
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
                    "com.android.settings", "com.samsung.android.settings", "com.miui.securitycenter",
                    "com.coloros.settings", "com.oppo.settings", "com.vivo.settings",
                    "com.huawei.systemmanager", "com.oneplus.settings", "com.google.android.settings.intelligence"
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
    fun onOverlayDismissed() = performGlobalAction(GLOBAL_ACTION_HOME)

    override fun onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted")
    }

    override fun onDestroy() {
        overlayManager?.dismiss()
        overlayManager = null
        isRunning = false
        instance = null
        Log.d(TAG, "Accessibility service destroyed")
        super.onDestroy()
    }
}
