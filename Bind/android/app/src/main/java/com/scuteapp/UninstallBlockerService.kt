package com.scuteapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Foreground service that monitors for app uninstall attempts and blocks them
 * for apps that are in the blocked list during an active session.
 */
class UninstallBlockerService : Service() {

    companion object {
        private const val TAG = "UninstallBlocker"
        private const val CHANNEL_ID = "scute_blocker_channel"
        private const val ALERT_CHANNEL_ID = "scute_session_alerts"
        private const val NOTIFICATION_ID = 1001
        private const val SESSION_END_NOTIFICATION_ID = 2003
        private const val SYNC_CHECK_INTERVAL_MS = 10_000L // 10 seconds

        const val PREFS_NAME = "ScuteBlockerPrefs"
        const val KEY_BLOCKED_APPS = "blocked_apps"
        const val KEY_SESSION_ACTIVE = "session_active"
        const val KEY_SESSION_END_TIME = "session_end_time"

        /**
         * Show "Session Ended" notification when a timed session expires.
         * Called from BlockingModule when stopping a session due to timer expiry.
         */
        fun showSessionEndedNotification(context: Context, presetName: String?) {
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                // Create the high-priority notification channel (Android 8+)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val channel = NotificationChannel(
                        ALERT_CHANNEL_ID,
                        "Session Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Alerts when blocking sessions end"
                        enableVibration(true)
                        enableLights(true)
                        setShowBadge(true)
                    }
                    notificationManager.createNotificationChannel(channel)
                }

                // Create intent to open the app when notification is tapped
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    SESSION_END_NOTIFICATION_ID,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val displayName = presetName ?: "Session"

                // Build the notification with high priority for heads-up display
                val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
                    .setContentTitle("Session Ended")
                    .setContentText("\"$displayName\" has ended. Your apps are now unlocked.")
                    .setSmallIcon(R.drawable.ic_notification_unlock)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)
                    .setDefaults(NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_LIGHTS)
                    .build()

                notificationManager.notify(SESSION_END_NOTIFICATION_ID, notification)
                Log.d(TAG, "Showed session ended notification for: $displayName")

            } catch (e: Exception) {
                Log.e(TAG, "Failed to show session ended notification", e)
            }
        }
    }

    private var packageRemovedReceiver: BroadcastReceiver? = null
    private var appMonitor: AppMonitorService? = null
    private var websiteMonitor: WebsiteMonitorService? = null
    private val syncHandler = Handler(Looper.getMainLooper())
    private val syncCheckRunnable = object : Runnable {
        override fun run() {
            checkBackendLockStatus()
            syncHandler.postDelayed(this, SYNC_CHECK_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "UninstallBlockerService created")
        createNotificationChannel()
        registerPackageReceiver()

        // Start app monitoring with UsageStats (fast polling)
        appMonitor = AppMonitorService(this).apply {
            onGoHome = {
                // Use accessibility service to go home if available
                ScuteAccessibilityService.instance?.goHome()
            }
            startMonitoring()
        }
        Log.d(TAG, "AppMonitorService started")

        // Start website monitoring with fast polling
        websiteMonitor = WebsiteMonitorService(this).apply {
            onRedirectToSafeUrl = {
                // Redirect to google.com while overlay is showing (underneath)
                ScuteAccessibilityService.instance?.navigateToUrl("https://google.com")
            }
            onDismissed = {
                // Nothing needed on dismiss - user is already on google.com
            }
            startMonitoring()
        }
        Log.d(TAG, "WebsiteMonitorService started")

        // Start periodic backend sync check for notification accuracy
        syncHandler.postDelayed(syncCheckRunnable, SYNC_CHECK_INTERVAL_MS)
        Log.d(TAG, "Backend sync check started (every ${SYNC_CHECK_INTERVAL_MS / 1000}s)")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "UninstallBlockerService started")

        // Verify session is actually active before showing the notification
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val isSessionActive = prefs.getBoolean(KEY_SESSION_ACTIVE, false)
        if (!isSessionActive) {
            Log.d(TAG, "Session is not active - stopping service immediately")
            // Must call startForeground before stopping to avoid Android crash,
            // but use FOREGROUND_SERVICE_DEFERRED to minimize visible flash
            val emptyNotification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_lock)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setSilent(true)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_DEFERRED)
                .build()
            startForeground(NOTIFICATION_ID, emptyNotification)
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        // Show floating bubble for all active sessions (if not already showing)
        val bubbleManager = FloatingBubbleManager.getInstance(this)
        if (!bubbleManager.isShowing()) {
            try {
                val noTimeLimit = prefs.getBoolean("no_time_limit", false)
                if (noTimeLimit) {
                    val sessionStartTime = prefs.getLong("session_start_time", System.currentTimeMillis())
                    bubbleManager.showNoTimeLimit(sessionStartTime)
                    Log.d(TAG, "Showing floating bubble for no-time-limit session")
                } else {
                    val sessionEndTime = prefs.getLong(KEY_SESSION_END_TIME, 0)
                    if (sessionEndTime > System.currentTimeMillis()) {
                        bubbleManager.show(sessionEndTime)
                        Log.d(TAG, "Showing floating bubble for timed session")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show floating bubble", e)
            }
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()

        // Stop backend sync check
        syncHandler.removeCallbacks(syncCheckRunnable)

        // Stop app monitoring
        appMonitor?.stopMonitoring()
        appMonitor = null

        // Stop website monitoring
        websiteMonitor?.stopMonitoring()
        websiteMonitor = null

        unregisterPackageReceiver()

        // Explicitly cancel the foreground notification
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.cancel(NOTIFICATION_ID)

        Log.d(TAG, "UninstallBlockerService destroyed and notification cancelled")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Scute App Blocker",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Protects blocked apps from being uninstalled"
                setShowBadge(false)
                // Disable sound for this persistent notification
                setSound(null, null)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val presetName = prefs.getString("active_preset_name", null) ?: "Preset"
        val isScheduledPreset = prefs.getBoolean("is_scheduled_preset", false)

        // Create intent to open the app when notification is tapped
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            NOTIFICATION_ID,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // For scheduled presets, show a simpler notification without "in session" text
        val contentText = if (isScheduledPreset) {
            "\"$presetName\" blocking active"
        } else {
            "\"$presetName\" in session"
        }

        // Only show foreground notification for non-scheduled presets
        // Scheduled presets show their own high-priority notification
        if (isScheduledPreset) {
            // Return a minimal silent notification for scheduled presets
            return NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Scute Protection Active")
                .setContentText(contentText)
                .setSmallIcon(R.drawable.ic_notification_lock)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_DEFERRED)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setSilent(true)
                .build()
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Scute Protection Active")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_notification_lock)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOngoing(true) // Makes it non-dismissible
            .setContentIntent(pendingIntent)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun registerPackageReceiver() {
        packageRemovedReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == Intent.ACTION_PACKAGE_REMOVED ||
                    intent?.action == Intent.ACTION_UNINSTALL_PACKAGE) {
                    val packageName = intent.data?.schemeSpecificPart
                    Log.d(TAG, "Package removal detected: $packageName")

                    if (packageName != null && isAppBlocked(packageName)) {
                        Log.d(TAG, "Blocked app uninstall attempt: $packageName")
                        // The uninstall has already happened at this point,
                        // but we can log it and potentially notify the user
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_UNINSTALL_PACKAGE)
            addDataScheme("package")
        }

        // Android 14+ requires specifying RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(packageRemovedReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(packageRemovedReceiver, filter)
        }
    }

    private fun unregisterPackageReceiver() {
        packageRemovedReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering receiver", e)
            }
        }
    }

    /**
     * Check backend lock status and stop service if backend says not locked.
     * Runs on a background thread to avoid blocking the main thread.
     */
    private fun checkBackendLockStatus() {
        thread {
            try {
                val token = getAuthTokenFromAsyncStorage() ?: return@thread

                val apiUrl = "${BuildConfig.API_URL}/api/lock-status"
                val url = URL(apiUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val responseBody = connection.inputStream.bufferedReader().readText()
                    val json = JSONObject(responseBody)
                    val isLocked = json.optBoolean("isLocked", true)

                    if (!isLocked) {
                        Log.d(TAG, "Backend says not locked - clearing session and stopping service")
                        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        prefs.edit()
                            .putBoolean(KEY_SESSION_ACTIVE, false)
                            .putStringSet(KEY_BLOCKED_APPS, emptySet())
                            .putStringSet("blocked_websites", emptySet())
                            .remove("active_preset_id")
                            .remove("active_preset_name")
                            .remove("is_scheduled_preset")
                            .apply()

                        // Stop on main thread
                        syncHandler.post { stopSelf() }
                    }
                }
                connection.disconnect()
            } catch (e: Exception) {
                // Silently skip on any error - don't stop service due to transient network issues
                Log.d(TAG, "Backend sync check failed (will retry): ${e.message}")
            }
        }
    }

    private fun getAuthTokenFromAsyncStorage(): String? {
        var db: SQLiteDatabase? = null
        try {
            val dbPath = getDatabasePath("RKStorage").absolutePath
            val dbFile = java.io.File(dbPath)
            if (!dbFile.exists()) return null

            db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = db.rawQuery(
                "SELECT value FROM catalystLocalStorage WHERE key = ?",
                arrayOf("@scute_auth_token")
            )

            var token: String? = null
            if (cursor.moveToFirst()) {
                token = cursor.getString(0)
            }
            cursor.close()
            return token
        } catch (e: Exception) {
            return null
        } finally {
            db?.close()
        }
    }

    private fun isAppBlocked(packageName: String): Boolean {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Check if session is active
        if (!prefs.getBoolean(KEY_SESSION_ACTIVE, false)) {
            return false
        }

        // Check if session has expired
        val endTime = prefs.getLong(KEY_SESSION_END_TIME, 0)
        if (System.currentTimeMillis() > endTime) {
            return false
        }

        // Check if app is in blocked list
        val blockedApps = prefs.getStringSet(KEY_BLOCKED_APPS, emptySet()) ?: emptySet()
        return blockedApps.contains(packageName)
    }
}
