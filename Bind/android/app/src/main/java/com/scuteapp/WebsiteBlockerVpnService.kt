package com.scuteapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetAddress
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean

/**
 * VPN Service that intercepts DNS requests and blocks specified websites.
 * Uses a local VPN tunnel - no traffic leaves the device.
 */
class WebsiteBlockerVpnService : VpnService() {

    companion object {
        private const val TAG = "WebsiteBlockerVpn"
        private const val CHANNEL_ID = "website_blocker_vpn"
        private const val NOTIFICATION_ID = 2001

        const val ACTION_START = "com.scuteapp.vpn.START"
        const val ACTION_STOP = "com.scuteapp.vpn.STOP"

        @Volatile
        var isRunning = false
            private set
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private var vpnThread: Thread? = null
    private val isActive = AtomicBoolean(false)
    private var blockedDomains: Set<String> = emptySet()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopVpn()
                return START_NOT_STICKY
            }
            ACTION_START, null -> {
                loadBlockedDomains()
                if (blockedDomains.isNotEmpty()) {
                    startVpn()
                } else {
                    Log.d(TAG, "No domains to block, not starting VPN")
                    stopSelf()
                }
            }
        }
        return START_STICKY
    }

    private fun loadBlockedDomains() {
        val prefs = getSharedPreferences(UninstallBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
        blockedDomains = prefs.getStringSet("blocked_websites", emptySet()) ?: emptySet()
        Log.d(TAG, "Loaded ${blockedDomains.size} blocked domains: $blockedDomains")
    }

    private fun startVpn() {
        if (isActive.get()) {
            Log.d(TAG, "VPN already running")
            return
        }

        try {
            // Build VPN interface
            val builder = Builder()
                .setSession("Scute Website Blocker")
                .addAddress("10.0.0.2", 32)
                .addRoute("0.0.0.0", 0)
                .addDnsServer("8.8.8.8")
                .addDnsServer("8.8.4.4")
                .setMtu(1500)
                .setBlocking(true)

            // Allow the app itself to bypass VPN to prevent loops
            try {
                builder.addDisallowedApplication(packageName)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to exclude app from VPN", e)
            }

            vpnInterface = builder.establish()

            if (vpnInterface == null) {
                Log.e(TAG, "Failed to establish VPN interface")
                stopSelf()
                return
            }

            isActive.set(true)
            isRunning = true

            // Start foreground notification
            startForeground(NOTIFICATION_ID, createNotification())

            // Start packet processing thread
            vpnThread = Thread(::processPackets, "VpnThread")
            vpnThread?.start()

            Log.d(TAG, "VPN started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start VPN", e)
            stopVpn()
        }
    }

    private fun processPackets() {
        val vpnFd = vpnInterface ?: return
        val inputStream = FileInputStream(vpnFd.fileDescriptor)
        val outputStream = FileOutputStream(vpnFd.fileDescriptor)
        val buffer = ByteBuffer.allocate(32767)

        try {
            while (isActive.get()) {
                buffer.clear()
                val length = inputStream.read(buffer.array())

                if (length > 0) {
                    buffer.limit(length)

                    // Parse IP packet
                    val packet = buffer.array().copyOf(length)

                    // Check if it's a DNS request (UDP port 53)
                    if (isDnsRequest(packet)) {
                        val domain = extractDomainFromDns(packet)
                        if (domain != null && shouldBlockDomain(domain)) {
                            Log.d(TAG, "Blocking DNS request for: $domain")
                            // Send back an empty/error response or just drop the packet
                            val response = createBlockedDnsResponse(packet)
                            if (response != null) {
                                outputStream.write(response)
                            }
                            continue
                        }
                    }

                    // Forward non-blocked packets
                    // Note: For a full implementation, we'd need to handle packet forwarding
                    // This simplified version just blocks DNS requests
                }
            }
        } catch (e: Exception) {
            if (isActive.get()) {
                Log.e(TAG, "VPN packet processing error", e)
            }
        } finally {
            inputStream.close()
            outputStream.close()
        }
    }

    private fun isDnsRequest(packet: ByteArray): Boolean {
        if (packet.size < 28) return false

        // Check IP version (should be 4)
        val version = (packet[0].toInt() and 0xF0) shr 4
        if (version != 4) return false

        // Check protocol (17 = UDP)
        val protocol = packet[9].toInt() and 0xFF
        if (protocol != 17) return false

        // Get IP header length
        val ihl = (packet[0].toInt() and 0x0F) * 4

        // Check destination port (53 = DNS)
        if (packet.size < ihl + 4) return false
        val destPort = ((packet[ihl + 2].toInt() and 0xFF) shl 8) or (packet[ihl + 3].toInt() and 0xFF)

        return destPort == 53
    }

    private fun extractDomainFromDns(packet: ByteArray): String? {
        try {
            // Get IP header length
            val ihl = (packet[0].toInt() and 0x0F) * 4
            // UDP header is 8 bytes
            val dnsStart = ihl + 8

            if (packet.size < dnsStart + 12) return null

            // DNS question starts at offset 12 from DNS header
            var offset = dnsStart + 12
            val domain = StringBuilder()

            while (offset < packet.size) {
                val labelLength = packet[offset].toInt() and 0xFF
                if (labelLength == 0) break

                if (domain.isNotEmpty()) domain.append(".")

                for (i in 1..labelLength) {
                    if (offset + i >= packet.size) return null
                    domain.append(packet[offset + i].toInt().toChar())
                }
                offset += labelLength + 1
            }

            return domain.toString().lowercase()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract domain from DNS", e)
            return null
        }
    }

    private fun shouldBlockDomain(domain: String): Boolean {
        // Check exact match
        if (blockedDomains.contains(domain)) return true

        // Check if it's a subdomain of a blocked domain
        for (blocked in blockedDomains) {
            if (domain == blocked || domain.endsWith(".$blocked")) {
                return true
            }
        }

        return false
    }

    private fun createBlockedDnsResponse(request: ByteArray): ByteArray? {
        try {
            // Get IP header length
            val ihl = (request[0].toInt() and 0x0F) * 4
            val udpStart = ihl
            val dnsStart = ihl + 8

            // Create response by modifying the request
            val response = request.copyOf()

            // Swap source and destination IPs
            for (i in 0..3) {
                val tmp = response[12 + i]
                response[12 + i] = response[16 + i]
                response[16 + i] = tmp
            }

            // Swap source and destination ports
            val tmp0 = response[udpStart]
            val tmp1 = response[udpStart + 1]
            response[udpStart] = response[udpStart + 2]
            response[udpStart + 1] = response[udpStart + 3]
            response[udpStart + 2] = tmp0
            response[udpStart + 3] = tmp1

            // Set DNS flags: response, no error -> NXDOMAIN (name error)
            // Flags at dnsStart + 2
            response[dnsStart + 2] = 0x81.toByte() // Response, recursion desired
            response[dnsStart + 3] = 0x83.toByte() // NXDOMAIN (Name Error)

            // Recalculate UDP checksum (set to 0 for now, valid for IPv4)
            response[udpStart + 6] = 0
            response[udpStart + 7] = 0

            return response
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create blocked DNS response", e)
            return null
        }
    }

    private fun stopVpn() {
        Log.d(TAG, "Stopping VPN")
        isActive.set(false)
        isRunning = false

        vpnThread?.interrupt()
        vpnThread = null

        try {
            vpnInterface?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error closing VPN interface", e)
        }
        vpnInterface = null

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Website Blocker",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active when website blocking is enabled"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val stopIntent = Intent(this, WebsiteBlockerVpnService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Website Blocking Active")
            .setContentText("${blockedDomains.size} websites blocked")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)
            .build()
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    override fun onRevoke() {
        stopVpn()
        super.onRevoke()
    }
}
