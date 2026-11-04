export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  aliases?: string[];
  avatar?: string;
}

export interface ActionLogItem {
  id: string;
  timestamp: string;
  toolName: string;
  rawArgs: Record<string, any>;
  status: "success" | "clarification" | "fallback" | "failed";
  platform: "android_native_bridge" | "web_deep_link" | "web_dialer" | "web_browser";
  summary: string;
  details?: any;
}

export type ConnectionState = "idle" | "connecting" | "connected" | "error" | "closed";

export interface AndroidBridgeInterface {
  openApp?: (appName: string) => boolean | string;
  makeCall?: (phoneNumber: string) => boolean | string;
  callContact?: (contactName: string) => string;
  openWhatsApp?: (message?: string, phoneNumber?: string) => boolean | string;
  openUrl?: (url: string) => boolean | string;
  getContacts?: () => string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
  }
}
