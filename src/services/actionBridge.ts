import { Contact, ActionLogItem } from "../types";

export const DEFAULT_CONTACTS: Contact[] = [
  {
    id: "c1",
    name: "Mom",
    phone: "+91 98765 43210",
    relationship: "Mother",
    aliases: ["mom", "mummy", "mother", "maa", "ammi"],
    avatar: "👩",
  },
  {
    id: "c2",
    name: "Dad",
    phone: "+91 98000 11122",
    relationship: "Father",
    aliases: ["dad", "papa", "father", "daddy", "abba", "pitaji"],
    avatar: "👨",
  },
  {
    id: "c3",
    name: "Rahul Sharma",
    phone: "+91 98111 22233",
    relationship: "Friend / College",
    aliases: ["rahul", "rahul sharma", "bhaiya"],
    avatar: "🧑",
  },
  {
    id: "c4",
    name: "Rahul Verma",
    phone: "+91 98222 33344",
    relationship: "Colleague / Office",
    aliases: ["rahul", "rahul verma"],
    avatar: "👨‍💼",
  },
  {
    id: "c5",
    name: "Priya Patel",
    phone: "+91 98333 44455",
    relationship: "Sister",
    aliases: ["priya", "priya patel", "didi", "sister"],
    avatar: "👧",
  },
  {
    id: "c6",
    name: "Vikram Singh",
    phone: "+91 98444 55566",
    relationship: "Brother",
    aliases: ["vikram", "vikram singh", "bhai"],
    avatar: "🧑‍🦱",
  },
];

export interface BridgeExecutionResult {
  success: boolean;
  action: string;
  platform: "android_native_bridge" | "web_deep_link" | "web_dialer" | "web_browser";
  message: string;
  details?: any;
  status: "success" | "clarification" | "fallback" | "failed";
}

/**
 * Checks if a real Android Bridge is injected via WebView
 */
export function isNativeAndroidBridgeAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.AndroidBridge);
}

/**
 * Normalizes phone numbers
 */
export function sanitizePhoneNumber(phone: string): string {
  // Keep leading +, digits only
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Dispatches an action via Android Native Bridge or safe Web fallback
 */
export async function executeDeviceAction(
  name: string,
  args: Record<string, any>,
  contacts: Contact[],
  simulateBridge: boolean = false
): Promise<BridgeExecutionResult> {
  const isNative = isNativeAndroidBridgeAvailable() || simulateBridge;
  console.log(`[Executing Action] ${name}`, { args, isNative, simulateBridge });

  switch (name) {
    case "openWhatsApp": {
      const phone = args.phoneNumber ? sanitizePhoneNumber(args.phoneNumber) : "";
      const text = args.message ? encodeURIComponent(args.message) : "";

      if (isNative && window.AndroidBridge?.openWhatsApp) {
        try {
          window.AndroidBridge.openWhatsApp(args.message, args.phoneNumber);
          return {
            success: true,
            status: "success",
            action: "openWhatsApp",
            platform: "android_native_bridge",
            message: "WhatsApp launched via Android Native Intent (com.whatsapp).",
          };
        } catch (e: any) {
          console.warn("Native bridge call failed, falling back", e);
        }
      }

      if (simulateBridge) {
        return {
          success: true,
          status: "success",
          action: "openWhatsApp",
          platform: "android_native_bridge",
          message: "Simulated Android Intent: startActivity(Intent(ACTION_VIEW, Uri.parse('whatsapp://send'))).",
        };
      }

      // Safe Web fallback / deep link
      let waUrl = "https://web.whatsapp.com";
      if (phone) {
        waUrl = `https://wa.me/${phone}${text ? `?text=${text}` : ""}`;
      } else {
        // Try direct app protocol first, then web
        waUrl = "whatsapp://send";
      }

      try {
        const link = document.createElement("a");
        link.href = waUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return {
          success: true,
          status: "success",
          action: "openWhatsApp",
          platform: "web_deep_link",
          message: `WhatsApp opened using ${waUrl.startsWith("whatsapp://") ? "deep link (whatsapp://)" : "WhatsApp Web"}`,
          details: { url: waUrl },
        };
      } catch (err: any) {
        window.open(waUrl, "_blank");
        return {
          success: true,
          status: "success",
          action: "openWhatsApp",
          platform: "web_deep_link",
          message: "WhatsApp Web opened in new tab.",
          details: { url: waUrl },
        };
      }
    }

    case "openApp": {
      const appName = (args.appName || "").toLowerCase().trim();

      if (isNative && window.AndroidBridge?.openApp) {
        try {
          const res = window.AndroidBridge.openApp(args.appName);
          return {
            success: true,
            status: "success",
            action: "openApp",
            platform: "android_native_bridge",
            message: `Launched ${args.appName} via Android PackageManager intent.`,
            details: { result: res },
          };
        } catch (e: any) {
          console.warn("Native bridge openApp error", e);
        }
      }

      if (simulateBridge) {
        return {
          success: true,
          status: "success",
          action: "openApp",
          platform: "android_native_bridge",
          message: `Simulated Android Bridge: Launched package for '${args.appName}'.`,
        };
      }

      // Safe web / deep-link mappings for known apps
      const APP_MAP: Record<string, { url: string; deepLink?: string; label: string }> = {
        youtube: {
          url: "https://www.youtube.com",
          deepLink: "vnd.youtube://",
          label: "YouTube",
        },
        instagram: {
          url: "https://www.instagram.com",
          deepLink: "instagram://app",
          label: "Instagram",
        },
        chrome: {
          url: "https://www.google.com",
          deepLink: "googlechrome://",
          label: "Google Chrome",
        },
        maps: {
          url: "https://maps.google.com",
          deepLink: "geo:0,0",
          label: "Google Maps",
        },
        spotify: {
          url: "https://open.spotify.com",
          deepLink: "spotify://",
          label: "Spotify",
        },
        twitter: {
          url: "https://x.com",
          deepLink: "twitter://",
          label: "X (Twitter)",
        },
        x: {
          url: "https://x.com",
          deepLink: "twitter://",
          label: "X (Twitter)",
        },
      };

      if (appName === "settings" || appName.includes("setting")) {
        // Platform restriction: Web browsers strictly cannot open Android OS settings
        return {
          success: false,
          status: "fallback",
          action: "openApp",
          platform: "web_browser",
          message:
            "Android System Settings can only be opened when packaged as a native Android APK (Intent ACTION_SETTINGS). Browser security prevents opening device settings.",
          details: {
            requiredBridge: "window.AndroidBridge.openApp('settings')",
          },
        };
      }

      const match = APP_MAP[appName] || Object.entries(APP_MAP).find(([k]) => appName.includes(k))?.[1];

      if (match) {
        window.open(match.url, "_blank", "noopener,noreferrer");
        return {
          success: true,
          status: "success",
          action: "openApp",
          platform: "web_deep_link",
          message: `Opened ${match.label} via web URL (${match.url}).`,
          details: { url: match.url },
        };
      }

      // Unknown app fallback
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(args.appName + " app")}`;
      window.open(searchUrl, "_blank", "noopener,noreferrer");
      return {
        success: true,
        status: "fallback",
        action: "openApp",
        platform: "web_browser",
        message: `Direct launcher for '${args.appName}' unavailable in browser. Opened Google search fallback.`,
        details: { searchUrl },
      };
    }

    case "openUrl": {
      let rawUrl = (args.url || "").trim();
      if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
        rawUrl = "https://" + rawUrl;
      }

      if (isNative && window.AndroidBridge?.openUrl) {
        window.AndroidBridge.openUrl(rawUrl);
        return {
          success: true,
          status: "success",
          action: "openUrl",
          platform: "android_native_bridge",
          message: `Opened ${rawUrl} via Android Intent(ACTION_VIEW).`,
        };
      }

      if (simulateBridge) {
        return {
          success: true,
          status: "success",
          action: "openUrl",
          platform: "android_native_bridge",
          message: `Simulated Android Intent: ACTION_VIEW -> ${rawUrl}`,
        };
      }

      window.open(rawUrl, "_blank", "noopener,noreferrer");
      return {
        success: true,
        status: "success",
        action: "openUrl",
        platform: "web_browser",
        message: `Opened ${rawUrl} in a new browser tab.`,
        details: { url: rawUrl },
      };
    }

    case "makeCall": {
      const rawNumber = String(args.phoneNumber || "");
      const sanitized = sanitizePhoneNumber(rawNumber);

      if (!sanitized) {
        return {
          success: false,
          status: "failed",
          action: "makeCall",
          platform: isNative ? "android_native_bridge" : "web_dialer",
          message: "Invalid or empty phone number provided.",
        };
      }

      if (isNative && window.AndroidBridge?.makeCall) {
        try {
          window.AndroidBridge.makeCall(sanitized);
          return {
            success: true,
            status: "success",
            action: "makeCall",
            platform: "android_native_bridge",
            message: `Initiated phone call to ${sanitized} via Android ACTION_CALL intent.`,
            details: { phoneNumber: sanitized },
          };
        } catch (e: any) {
          console.warn("Native bridge call error", e);
        }
      }

      if (simulateBridge) {
        return {
          success: true,
          status: "success",
          action: "makeCall",
          platform: "android_native_bridge",
          message: `Simulated Android ACTION_CALL: tel:${sanitized}`,
          details: { phoneNumber: sanitized },
        };
      }

      // Safe Web fallback: tel: link triggers the OS dialer pre-filled with the number
      try {
        const link = document.createElement("a");
        link.href = `tel:${sanitized}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return {
          success: true,
          status: "success",
          action: "makeCall",
          platform: "web_dialer",
          message: `Triggered device telephone dialer for ${sanitized} (tel:${sanitized}).`,
          details: { phoneNumber: sanitized },
        };
      } catch (err: any) {
        window.location.href = `tel:${sanitized}`;
        return {
          success: true,
          status: "success",
          action: "makeCall",
          platform: "web_dialer",
          message: `Navigated to tel:${sanitized}`,
          details: { phoneNumber: sanitized },
        };
      }
    }

    case "callContact": {
      const query = (args.contactName || "").toLowerCase().trim();
      console.log(`[Contact Lookup] Query: "${query}"`);

      // Search contacts
      const matches = contacts.filter((c) => {
        const nameLower = c.name.toLowerCase();
        const relLower = (c.relationship || "").toLowerCase();
        const aliases = (c.aliases || []).map((a) => a.toLowerCase());

        // Exact match
        if (nameLower === query || relLower === query || aliases.includes(query)) {
          return true;
        }

        // Substring / word boundary match (e.g., query "rahul" matches "Rahul Sharma" and "Rahul Verma")
        if (nameLower.includes(query) || query.includes(nameLower)) {
          return true;
        }

        // Aliases substring
        if (aliases.some((a) => a.includes(query) || query.includes(a))) {
          return true;
        }

        return false;
      });

      console.log(`[Contact Lookup Result] Matches found: ${matches.length}`, matches);

      // 0 matches found
      if (matches.length === 0) {
        return {
          success: false,
          status: "failed",
          action: "callContact",
          platform: isNative ? "android_native_bridge" : "web_dialer",
          message: `No contact found in address book for "${args.contactName}".`,
          details: { matchCount: 0, requestedName: args.contactName },
        };
      }

      // Exactly 1 match found -> initiate call immediately
      if (matches.length === 1) {
        const target = matches[0];
        const callResult = await executeDeviceAction(
          "makeCall",
          { phoneNumber: target.phone },
          contacts,
          simulateBridge
        );

        return {
          success: true,
          status: "success",
          action: "callContact",
          platform: callResult.platform,
          message: `Found 1 exact match: ${target.name} (${target.phone}). Call initiated!`,
          details: {
            matchCount: 1,
            contact: target,
            callResult,
          },
        };
      }

      // Multiple matches found -> require clarification (e.g. "Rahul Sharma" vs "Rahul Verma")
      const candidateList = matches.map((m) => `${m.name} (${m.relationship || m.phone})`).join(", ");
      return {
        success: false,
        status: "clarification",
        action: "callContact",
        platform: isNative ? "android_native_bridge" : "web_dialer",
        message: `Found ${matches.length} contacts matching "${args.contactName}": ${candidateList}. Please ask user which one to call.`,
        details: {
          matchCount: matches.length,
          matches: matches.map((m) => ({ name: m.name, phone: m.phone, relationship: m.relationship })),
        },
      };
    }

    default:
      return {
        success: false,
        status: "failed",
        action: name,
        platform: "web_browser",
        message: `Unknown tool function: ${name}`,
      };
  }
}
