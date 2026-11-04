import React, { useState } from "react";
import { X, Smartphone, CheckCircle, Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { isNativeAndroidBridgeAvailable } from "../services/actionBridge";

interface NativeBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulateBridge: boolean;
  onToggleSimulateBridge: (val: boolean) => void;
}

export const NativeBridgeModal: React.FC<NativeBridgeModalProps> = ({
  isOpen,
  onClose,
  simulateBridge,
  onToggleSimulateBridge,
}) => {
  const [copied, setCopied] = useState(false);
  const isRealNative = isNativeAndroidBridgeAvailable();

  if (!isOpen) return null;

  const androidBridgeCode = `// Android Kotlin WebView Bridge (AndroidBridge.kt)
package com.doremon.ai

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface

class AndroidBridge(private val context: Context) {

    @JavascriptInterface
    fun openWhatsApp(message: String? = null, phoneNumber: String? = null): Boolean {
        return try {
            val intent = if (!phoneNumber.isNullOrEmpty()) {
                Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$phoneNumber" + if (message != null) "?text=$message" else ""))
            } else {
                context.packageManager.getLaunchIntentForPackage("com.whatsapp") 
                    ?: Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/"))
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun openApp(appName: String): Boolean {
        return try {
            val packageName = when (appName.lowercase()) {
                "youtube" -> "com.google.android.youtube"
                "instagram" -> "com.instagram.android"
                "chrome" -> "com.android.chrome"
                "maps" -> "com.google.android.apps.maps"
                "spotify" -> "com.spotify.music"
                "settings" -> {
                    val intent = Intent(android.provider.Settings.ACTION_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    return true
                }
                else -> appName
            }
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun makeCall(phoneNumber: String): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phoneNumber"))
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(dialIntent)
            true
        }
    }

    @JavascriptInterface
    fun openUrl(url: String): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }
}

// In your MainActivity.kt:
// webView.settings.javaScriptEnabled = true
// webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(androidBridgeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Android Action Bridge</h2>
              <p className="text-xs text-emerald-100">
                Native APK Integration &amp; Web Fallback System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-neutral-700">
          {/* Status Box */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Current Detection State
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRealNative || simulateBridge
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-blue-500"
                  }`}
                />
                <span className="font-bold text-sm text-neutral-900">
                  {isRealNative
                    ? "Native Android Bridge Detected (window.AndroidBridge)"
                    : simulateBridge
                    ? "Simulated APK Bridge Active"
                    : "Web Browser Mode (Deep-link & Tel Fallbacks Active)"}
                </span>
              </div>
            </div>

            {/* Simulation toggle */}
            {!isRealNative && (
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-neutral-300 shadow-2xs">
                <input
                  type="checkbox"
                  checked={simulateBridge}
                  onChange={(e) => onToggleSimulateBridge(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-bold text-neutral-800">
                  Simulate APK Bridge
                </span>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-neutral-900 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Platform Behavior Specification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <strong className="text-blue-900 block mb-1">
                  🌐 Web Browser Fallback:
                </strong>
                <ul className="list-disc pl-4 space-y-1 text-neutral-700">
                  <li>WhatsApp: deep link or web.whatsapp.com</li>
                  <li>Calls: standard tel: URI triggers OS dialer</li>
                  <li>Settings: informs user about APK requirements</li>
                  <li>YouTube / Instagram: opens web apps</li>
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <strong className="text-emerald-900 block mb-1">
                  📱 Native Android APK:
                </strong>
                <ul className="list-disc pl-4 space-y-1 text-neutral-700">
                  <li>Direct Android Intents &amp; PackageManager</li>
                  <li>Direct ACTION_CALL or ACTION_DIAL</li>
                  <li>Can open Settings (ACTION_SETTINGS)</li>
                  <li>Full background app switching</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Android Code Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-neutral-900 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-neutral-700" />
                Native Kotlin Bridge Snippet
              </h4>
              <button
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-2xl bg-neutral-900 text-neutral-100 text-[10px] font-mono overflow-x-auto max-h-48 border border-neutral-800">
              {androidBridgeCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
