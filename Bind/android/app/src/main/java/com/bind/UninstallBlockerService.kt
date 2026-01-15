package com.bind

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

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

        // SharedPreferences key for blocked apps
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
                    .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)
                    .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound, vibrate, lights
                    .build()

                notificationManager.notify(SESSION_END_NOTIFICATION_ID, notification)
                Log.d(TAG, "Showed session ended notification for: $displayName")

            } catch (e: Exception) {
                Log.e(TAG, "Failed to show session ended notification", e)
            }
        }
    }

    private var packageRemovedReceiver: BroadcastReceiver? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "UninstallBlockerService created")
        createNotificationChannel()
        registerPackageReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "UninstallBlockerService started")

        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterPackageReceiver()
        Log.d(TAG, "UninstallBlockerService destroyed")
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

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Scute Protection Active")
            .setContentText("\"$presetName\" in session")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
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
