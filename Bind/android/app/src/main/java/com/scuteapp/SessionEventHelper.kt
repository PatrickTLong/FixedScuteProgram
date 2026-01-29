package com.scuteapp

import android.content.Context
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Helper to emit session events (start/end) to React Native from broadcast receivers.
 */
object SessionEventHelper {
    private const val TAG = "SessionEventHelper"
    const val EVENT_SESSION_CHANGED = "onSessionChanged"

    fun emitSessionEvent(context: Context, type: String) {
        try {
            val reactApp = context.applicationContext as? ReactApplication ?: return
            val reactHost = reactApp.reactHost ?: return
            val reactContext = reactHost.currentReactContext ?: return

            val params = Arguments.createMap()
            params.putString("type", type)

            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_SESSION_CHANGED, params)

            Log.d(TAG, "Emitted session event: $type")
        } catch (e: Exception) {
            Log.d(TAG, "Could not emit session event (app may not be running): ${e.message}")
        }
    }
}
