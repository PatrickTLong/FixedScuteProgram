package com.scuteapp

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Device Admin Receiver for Bind app.
 * Used to prevent uninstallation of blocked apps during active blocking sessions.
 */
class BindDeviceAdminReceiver : DeviceAdminReceiver() {

    companion object {
        private const val TAG = "BindDeviceAdmin"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.d(TAG, "Device admin enabled")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.d(TAG, "Device admin disabled")
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        // Return a warning message when user tries to disable device admin
        return "Disabling device admin will allow uninstalling blocked apps. Are you sure you want to continue?"
    }
}
