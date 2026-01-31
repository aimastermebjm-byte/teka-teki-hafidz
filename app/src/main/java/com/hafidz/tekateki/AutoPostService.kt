package com.hafidz.tekateki

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class AutoPostService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // Ini adalah tempat robot "melihat" apa yang terjadi di layar
        val packageName = event.packageName?.toString()
        
        if (packageName == "com.whatsapp") {
            val rootNode = rootInActiveWindow ?: return
            
            // Contoh: Robot mencari tombol "Status" atau "Updates"
            // Kita pakai rekursif untuk mencari teks tertentu
            findNodeByText(rootNode, "Status")?.let {
                Log.d("RobotWA", "Ketemu tombol Status! Siap beraksi...")
            }
        }
    }

    private fun findNodeByText(node: AccessibilityNodeInfo, text: String): AccessibilityNodeInfo? {
        val nodes = node.findAccessibilityNodeInfosByText(text)
        return if (nodes.isNotEmpty()) nodes[0] else null
    }

    override fun onInterrupt() {
        Log.d("RobotWA", "Robot terhenti!")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("RobotWA", "Robot Aktif & Siap Bekerja!")
    }
}
