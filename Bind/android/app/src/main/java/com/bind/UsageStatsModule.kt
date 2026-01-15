package com.bind

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar

/**
 * Native module for getting app usage statistics.
 */
class UsageStatsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "UsageStatsModule"

        // Essential system apps to exclude from most used
        private val EXCLUDED_PACKAGES = setOf(
            "com.android.launcher",
            "com.android.launcher3",
            "com.google.android.apps.nexuslauncher",
            "com.sec.android.app.launcher",
            "com.android.systemui",
            "com.android.settings",
            "com.samsung.android.settings",
            "com.android.phone",
            "com.google.android.dialer",
            "com.samsung.android.dialer",
            "com.android.contacts",
            "com.google.android.contacts",
            "com.android.mms",
            "com.google.android.apps.messaging",
            "com.samsung.android.messaging",
            "com.android.vending", // Play Store
            "com.google.android.gms", // Google Play Services
            "com.google.android.gsf", // Google Services Framework
            "com.bind" // Our own app
        )
    }

    override fun getName(): String = "UsageStatsModule"

    /**
     * Get total screen time for today in milliseconds
     */
    @ReactMethod
    fun getTodayScreenTime(promise: Promise) {
        try {
            val usageStatsManager = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            if (usageStatsManager == null) {
                promise.resolve(0.0)
                return
            }

            val calendar = Calendar.getInstance()
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            val startOfDay = calendar.timeInMillis
            val endTime = System.currentTimeMillis()

            val usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startOfDay,
                endTime
            )

            var totalTime = 0L
            usageStatsList?.forEach { stat ->
                if (!EXCLUDED_PACKAGES.contains(stat.packageName)) {
                    totalTime += stat.totalTimeInForeground
                }
            }

            // Return in milliseconds
            promise.resolve(totalTime.toDouble())
        } catch (e: Exception) {
            Log.e(TAG, "Error getting screen time", e)
            promise.resolve(0.0)
        }
    }

    /**
     * Get the most used app today with its usage time
     */
    @ReactMethod
    fun getMostUsedAppToday(promise: Promise) {
        try {
            val usageStatsManager = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            if (usageStatsManager == null) {
                promise.resolve(null)
                return
            }

            val calendar = Calendar.getInstance()
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            val startOfDay = calendar.timeInMillis
            val endTime = System.currentTimeMillis()

            val usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startOfDay,
                endTime
            )

            var mostUsedApp: UsageStats? = null
            var maxTime = 0L

            usageStatsList?.forEach { stat ->
                if (!EXCLUDED_PACKAGES.contains(stat.packageName) && stat.totalTimeInForeground > maxTime) {
                    maxTime = stat.totalTimeInForeground
                    mostUsedApp = stat
                }
            }

            if (mostUsedApp == null || maxTime < 60000) { // Less than 1 minute
                promise.resolve(null)
                return
            }

            val packageManager = reactApplicationContext.packageManager
            val appName = try {
                val appInfo = packageManager.getApplicationInfo(mostUsedApp!!.packageName, 0)
                packageManager.getApplicationLabel(appInfo).toString()
            } catch (e: PackageManager.NameNotFoundException) {
                mostUsedApp!!.packageName
            }

            val result = Arguments.createMap().apply {
                putString("packageName", mostUsedApp!!.packageName)
                putString("appName", appName)
                putDouble("timeInForeground", maxTime.toDouble())
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting most used app", e)
            promise.resolve(null)
        }
    }

    /**
     * Get usage stats for all apps today
     */
    @ReactMethod
    fun getAllAppsUsageToday(promise: Promise) {
        try {
            val usageStatsManager = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            if (usageStatsManager == null) {
                promise.resolve(Arguments.createArray())
                return
            }

            val calendar = Calendar.getInstance()
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            val startOfDay = calendar.timeInMillis
            val endTime = System.currentTimeMillis()

            val usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startOfDay,
                endTime
            )

            val packageManager = reactApplicationContext.packageManager
            val appsArray = Arguments.createArray()

            // Sort by usage time descending
            usageStatsList?.filter {
                !EXCLUDED_PACKAGES.contains(it.packageName) && it.totalTimeInForeground > 60000 // More than 1 minute
            }?.sortedByDescending {
                it.totalTimeInForeground
            }?.take(10)?.forEach { stat ->
                val appName = try {
                    val appInfo = packageManager.getApplicationInfo(stat.packageName, 0)
                    packageManager.getApplicationLabel(appInfo).toString()
                } catch (e: PackageManager.NameNotFoundException) {
                    stat.packageName
                }

                val appMap = Arguments.createMap().apply {
                    putString("packageName", stat.packageName)
                    putString("appName", appName)
                    putDouble("timeInForeground", stat.totalTimeInForeground.toDouble())
                }
                appsArray.pushMap(appMap)
            }

            promise.resolve(appsArray)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting all apps usage", e)
            promise.resolve(Arguments.createArray())
        }
    }
}
