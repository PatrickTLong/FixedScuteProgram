package com.scuteapp

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Simple website monitor using fast polling.
 * Detects browser URL changes and shows blocking overlay when needed.
 *
 * NOTE: This requires ScuteAccessibilityService to be running to read browser URLs.
 * We poll the accessibility service for the current browser URL instead of relying
 * on accessibility events (which can be delayed or missed).
 */
class WebsiteMonitorService(private val context: Context) {

    companion object {
        private const val TAG = "WebsiteMonitorService"
        private const val POLL_INTERVAL_MS = 15L // Poll every 15ms for instant detection

        @Volatile
        var instance: WebsiteMonitorService? = null
            private set
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private var lastCheckedUrl: String? = null
    private var overlayManager: BlockedOverlayManager? = null

    // Callback to redirect to safe URL (called when blocking, before showing overlay)
    var onRedirectToSafeUrl: (() -> Unit)? = null

    // Callback for when overlay is dismissed
    var onDismissed: (() -> Unit)? = null

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring) return

            checkBrowserUrl()
            handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    /**
     * Start monitoring browser URLs
     */
    fun startMonitoring() {
        if (isMonitoring) return

        instance = this

        // Create overlay manager
        overlayManager = BlockedOverlayManager(context).apply {
            onDismissed = {
                // Reset last checked URL so monitoring will check again immediately
                lastCheckedUrl = null
                this@WebsiteMonitorService.onDismissed?.invoke()
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
     * Check current browser URL and block if needed
     */
    private fun checkBrowserUrl() {
        // Get the current foreground package from AppMonitorService
        val currentPackage = AppMonitorService.instance?.let {
            // Use reflection or a getter to get last foreground package
            // For now, we'll get it from the accessibility service
            null
        }

        // Get the accessibility service instance
        val accessibilityService = ScuteAccessibilityService.instance ?: return

        // Get current browser info from accessibility service
        val browserInfo = accessibilityService.getCurrentBrowserUrl()
        if (browserInfo == null) return

        val (packageName, url) = browserInfo

        // Skip if same as last check
        if (url == lastCheckedUrl) return
        lastCheckedUrl = url

        // Skip if overlay is already showing
        if (overlayManager?.isShowing() == true) return

        // Check if should block
        val blockedSite = shouldBlockWebsite(url)
        if (blockedSite != null) {
            Log.d(TAG, "BLOCKING website: $blockedSite (url: $url)")
            showBlockedOverlay(blockedSite)
        }
    }

    /**
     * Check if URL should be blocked
     * Returns the blocked domain if should block, null otherwise
     */
    private fun shouldBlockWebsite(url: String): String? {
        val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)

        // Check if session is active
        val isActive = prefs.getBoolean(UninstallBlockerService.KEY_SESSION_ACTIVE, false)
        if (!isActive) return null

        // Check if session has expired
        val endTime = prefs.getLong(UninstallBlockerService.KEY_SESSION_END_TIME, 0)
        if (System.currentTimeMillis() > endTime) return null

        // Get blocked websites
        val blockedWebsites = prefs.getStringSet("blocked_websites", emptySet()) ?: emptySet()
        if (blockedWebsites.isEmpty()) return null

        // Check each blocked site
        for (blockedSite in blockedWebsites) {
            if (urlMatchesDomain(url, blockedSite)) {
                return blockedSite
            }
        }

        return null
    }

    /**
     * Check if URL matches a blocked domain
     */
    private fun urlMatchesDomain(url: String, blockedDomain: String): Boolean {
        val normalizedUrl = url.lowercase()
            .removePrefix("https://")
            .removePrefix("http://")
            .removePrefix("www.")
        val normalizedDomain = blockedDomain.lowercase()
            .removePrefix("https://")
            .removePrefix("http://")
            .removePrefix("www.")
        return normalizedUrl.startsWith(normalizedDomain) || normalizedUrl.contains(".$normalizedDomain")
    }

    /**
     * Show blocking overlay for website
     */
    private fun showBlockedOverlay(blockedSite: String) {
        val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        val strictMode = prefs.getBoolean("strict_mode", true)
        val customBlockedText = prefs.getString("custom_blocked_text", "") ?: ""
        val customOverlayImage = prefs.getString("custom_overlay_image", "") ?: ""

        Log.d(TAG, "showBlockedOverlay: site=$blockedSite, customBlockedText='$customBlockedText', customOverlayImage='$customOverlayImage'")

        // Redirect to safe URL BEFORE showing overlay (so it appears underneath)
        redirectToSafeUrl()

        // Show overlay instantly with website name (use the blocked site as the display name)
        val shown = overlayManager?.show(
            BlockedOverlayManager.TYPE_WEBSITE, blockedSite, blockedSite, strictMode,
            customBlockedText, customOverlayImage
        ) ?: false

        if (!shown) {
            Log.w(TAG, "Failed to show overlay, falling back to activity")
            // Fallback: launch BlockedActivity
            BlockedActivity.launchNoAnimation(
                context = context,
                blockedType = BlockedActivity.TYPE_WEBSITE,
                blockedItem = blockedSite,
                strictMode = strictMode,
                customBlockedText = customBlockedText,
                customOverlayImage = customOverlayImage
            )
        }

        // Redirect to safe URL while overlay is showing (happens underneath the overlay)
        onRedirectToSafeUrl?.invoke()
    }

    /**
     * Redirect the browser to a safe URL (custom redirect URL or Google)
     */
    private fun redirectToSafeUrl() {
        try {
            val accessibilityService = ScuteAccessibilityService.instance
            if (accessibilityService != null) {
                val prefs = context.getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
                val rawRedirectUrl = prefs.getString("custom_redirect_url", "") ?: ""
                val customRedirectUrl = if (rawRedirectUrl.isNotEmpty() && !rawRedirectUrl.startsWith("http://") && !rawRedirectUrl.startsWith("https://")) {
                    "https://$rawRedirectUrl"
                } else {
                    rawRedirectUrl
                }
                val redirectUrl = if (customRedirectUrl.isNotEmpty()) customRedirectUrl else "https://www.google.com"
                Log.d(TAG, "[REDIRECT] SharedPrefs custom_redirect_url='$customRedirectUrl', resolved redirectUrl='$redirectUrl'")

                val allPrefs = prefs.all
                Log.d(TAG, "[REDIRECT] All SharedPrefs keys: ${allPrefs.keys.joinToString()}")
                Log.d(TAG, "[REDIRECT] custom_redirect_url value from prefs.all: ${allPrefs["custom_redirect_url"]}")

                val success = accessibilityService.navigateToUrl(redirectUrl)
                if (success) {
                    Log.d(TAG, "[REDIRECT] Successfully redirected to: $redirectUrl")
                } else {
                    Log.w(TAG, "[REDIRECT] FAILED to redirect to: $redirectUrl")
                }
            } else {
                Log.w(TAG, "[REDIRECT] Accessibility service not available for redirect")
            }
        } catch (e: Exception) {
            Log.e(TAG, "[REDIRECT] Error redirecting to safe URL", e)
        }
    }
}
