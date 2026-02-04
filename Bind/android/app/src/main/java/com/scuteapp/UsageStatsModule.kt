package com.scuteapp

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
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
            "com.scuteapp" // Our own app
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

                // Get app icon as base64
                try {
                    val icon = packageManager.getApplicationIcon(stat.packageName)
                    val iconBase64 = drawableToBase64(icon)
                    if (iconBase64 != null) {
                        appMap.putString("icon", "data:image/png;base64,$iconBase64")
                    }
                } catch (e: Exception) {
                    // Icon not available, skip
                }

                appsArray.pushMap(appMap)
            }

            promise.resolve(appsArray)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting all apps usage", e)
            promise.resolve(Arguments.createArray())
        }
    }

    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val size = 256
            val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && drawable is AdaptiveIconDrawable) {
                renderAdaptiveIcon(drawable, size)
            } else {
                val rawBitmap = drawableToBitmap(drawable, size)
                applyRoundedSquareMask(rawBitmap, size)
            }

            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
            val byteArray = outputStream.toByteArray()
            Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            null
        }
    }

    private fun renderAdaptiveIcon(drawable: AdaptiveIconDrawable, size: Int): Bitmap {
        val layerSize = (size * 1.5).toInt()
        val offset = (layerSize - size) / 2

        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val path = createSquirclePath(size.toFloat())
        canvas.clipPath(path)

        drawable.background?.let { bg ->
            bg.setBounds(-offset, -offset, layerSize - offset, layerSize - offset)
            bg.draw(canvas)
        }

        drawable.foreground?.let { fg ->
            fg.setBounds(-offset, -offset, layerSize - offset, layerSize - offset)
            fg.draw(canvas)
        }

        return bitmap
    }

    private fun createSquirclePath(size: Float): Path {
        val path = Path()
        val radius = size / 2f
        val center = size / 2f
        val n = 3.0

        val points = 100
        for (i in 0 until points) {
            val angle = 2.0 * Math.PI * i / points
            val cosA = Math.cos(angle)
            val sinA = Math.sin(angle)

            val signCos = if (cosA >= 0) 1.0 else -1.0
            val signSin = if (sinA >= 0) 1.0 else -1.0
            val x = center + radius * signCos * Math.pow(Math.abs(cosA), 2.0 / n)
            val y = center + radius * signSin * Math.pow(Math.abs(sinA), 2.0 / n)

            if (i == 0) {
                path.moveTo(x.toFloat(), y.toFloat())
            } else {
                path.lineTo(x.toFloat(), y.toFloat())
            }
        }
        path.close()
        return path
    }

    private fun applyRoundedSquareMask(source: Bitmap, size: Int): Bitmap {
        val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        val path = createSquirclePath(size.toFloat())
        canvas.drawPath(path, paint)

        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        val scaledSource = Bitmap.createScaledBitmap(source, size, size, true)
        canvas.drawBitmap(scaledSource, 0f, 0f, paint)

        return output
    }

    private fun drawableToBitmap(drawable: Drawable, size: Int): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return Bitmap.createScaledBitmap(drawable.bitmap, size, size, true)
        }

        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else size
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else size

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return Bitmap.createScaledBitmap(bitmap, size, size, true)
    }
}
