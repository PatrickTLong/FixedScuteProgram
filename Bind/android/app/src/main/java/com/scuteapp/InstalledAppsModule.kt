package com.scuteapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream

class InstalledAppsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var appChangeReceiver: BroadcastReceiver? = null

    override fun getName(): String {
        return "InstalledAppsModule"
    }

    override fun initialize() {
        super.initialize()
        registerAppChangeReceiver()
    }

    override fun invalidate() {
        super.invalidate()
        unregisterAppChangeReceiver()
    }

    private fun registerAppChangeReceiver() {
        if (appChangeReceiver != null) return

        appChangeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val action = intent?.action ?: return
                val packageName = intent.data?.schemeSpecificPart ?: return

                // Don't emit for our own app
                if (packageName == reactApplicationContext.packageName) return

                when (action) {
                    Intent.ACTION_PACKAGE_ADDED -> {
                        sendEvent("onAppsChanged", "installed")
                    }
                    Intent.ACTION_PACKAGE_REMOVED -> {
                        // Check if it's a full uninstall (not just an update)
                        val replacing = intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)
                        if (!replacing) {
                            sendEvent("onAppsChanged", "uninstalled")
                        }
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED)
            addAction(Intent.ACTION_PACKAGE_REMOVED)
            addDataScheme("package")
        }

        reactApplicationContext.registerReceiver(appChangeReceiver, filter)
    }

    private fun unregisterAppChangeReceiver() {
        appChangeReceiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                // Receiver might not be registered
            }
            appChangeReceiver = null
        }
    }

    private fun sendEvent(eventName: String, changeType: String) {
        val params = Arguments.createMap()
        params.putString("type", changeType)

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Common/popular apps that should appear first
    private val popularApps = listOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically", // TikTok
        "com.google.android.youtube",
        "com.twitter.android",
        "com.facebook.katana",
        "com.snapchat.android",
        "com.whatsapp",
        "com.facebook.orca", // Messenger
        "com.reddit.frontpage",
        "com.discord",
        "com.spotify.music",
        "com.netflix.mediaclient",
        "com.amazon.mShop.android.shopping",
        "com.pinterest",
        "com.linkedin.android",
        "tv.twitch.android.app",
        "com.tumblr",
        "com.google.android.apps.photos",
        "com.google.android.gm", // Gmail
        "com.microsoft.teams"
    )

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN, null)
            mainIntent.addCategory(Intent.CATEGORY_LAUNCHER)

            val resolvedInfos = pm.queryIntentActivities(mainIntent, 0)
            val appsList = mutableListOf<AppInfo>()
            val seenPackages = mutableSetOf<String>()

            for (resolveInfo in resolvedInfos) {
                val packageName = resolveInfo.activityInfo.packageName

                // Skip duplicates and system apps we don't want
                if (seenPackages.contains(packageName)) continue
                if (packageName == reactApplicationContext.packageName) continue // Skip our own app

                seenPackages.add(packageName)

                val appName = resolveInfo.loadLabel(pm).toString()
                val isPopular = popularApps.contains(packageName)
                val popularIndex = if (isPopular) popularApps.indexOf(packageName) else Int.MAX_VALUE

                appsList.add(AppInfo(packageName, appName, isPopular, popularIndex))
            }

            // Sort: popular apps first (by their index), then alphabetically
            appsList.sortWith(compareBy({ it.popularIndex }, { it.name.lowercase() }))

            val result: WritableArray = Arguments.createArray()
            for (app in appsList) {
                val appMap = Arguments.createMap()
                appMap.putString("id", app.packageName)
                appMap.putString("name", app.name)
                appMap.putBoolean("isPopular", app.isPopular)

                // Get app icon as base64
                try {
                    val icon = pm.getApplicationIcon(app.packageName)
                    val iconBase64 = drawableToBase64(icon)
                    if (iconBase64 != null) {
                        appMap.putString("icon", "data:image/png;base64,$iconBase64")
                    }
                } catch (e: Exception) {
                    // Icon not available, skip
                }

                result.pushMap(appMap)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get installed apps: ${e.message}")
        }
    }

    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val size = 256
            val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && drawable is AdaptiveIconDrawable) {
                // Render adaptive icon with rounded square mask like Android launcher
                renderAdaptiveIcon(drawable, size)
            } else {
                // For legacy icons, just render and apply rounded corners
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
        // Adaptive icons need extra canvas space for the layers
        val layerSize = (size * 1.5).toInt()
        val offset = (layerSize - size) / 2

        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Create squircle path (superellipse) like iOS/modern Android launchers
        val path = createSquirclePath(size.toFloat())
        canvas.clipPath(path)

        // Draw background layer
        drawable.background?.let { bg ->
            bg.setBounds(-offset, -offset, layerSize - offset, layerSize - offset)
            bg.draw(canvas)
        }

        // Draw foreground layer
        drawable.foreground?.let { fg ->
            fg.setBounds(-offset, -offset, layerSize - offset, layerSize - offset)
            fg.draw(canvas)
        }

        return bitmap
    }

    // Creates a true squircle (superellipse) path like iOS app icons
    private fun createSquirclePath(size: Float): Path {
        val path = Path()
        val radius = size / 2f
        val center = size / 2f
        // Squircle exponent - 3.0 gives a more rounded look
        val n = 3.0

        val points = 100
        for (i in 0 until points) {
            val angle = 2.0 * Math.PI * i / points
            val cosA = Math.cos(angle)
            val sinA = Math.sin(angle)

            // Superellipse formula: |x/a|^n + |y/b|^n = 1
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

        // Use squircle path for legacy icons too
        val path = createSquirclePath(size.toFloat())
        canvas.drawPath(path, paint)

        // Apply source bitmap with SRC_IN to mask it
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

    private data class AppInfo(
        val packageName: String,
        val name: String,
        val isPopular: Boolean,
        val popularIndex: Int
    )
}
