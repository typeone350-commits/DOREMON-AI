import React from "react";
import { ActionLogItem } from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Smartphone,
  ExternalLink,
  PhoneCall,
  MessageSquare,
  Clock,
  Layers,
} from "lucide-react";

interface ActionHistoryProps {
  logs: ActionLogItem[];
  onClearLogs?: () => void;
}

export const ActionHistory: React.FC<ActionHistoryProps> = ({ logs, onClearLogs }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-neutral-800">
            Device Action Execution Log
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
            {logs.length}
          </span>
        </div>
        {logs.length > 0 && onClearLogs && (
          <button
            onClick={onClearLogs}
            className="text-xs text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[380px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-400">
            <Smartphone className="w-8 h-8 mb-2 opacity-50 text-neutral-400" />
            <p className="text-xs font-medium text-neutral-500">
              No actions triggered yet
            </p>
            <p className="text-[11px] text-neutral-400 max-w-[240px] mt-0.5">
              Say &ldquo;WhatsApp kholo&rdquo;, &ldquo;Call Mom&rdquo;, or &ldquo;Open YouTube&rdquo; to execute actions!
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isNative = log.platform === "android_native_bridge";
            const isSuccess = log.status === "success";
            const isClarification = log.status === "clarification";

            return (
              <div
                key={log.id}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  isClarification
                    ? "bg-amber-50/80 border-amber-200"
                    : isSuccess
                    ? "bg-neutral-50/90 border-neutral-200 hover:border-blue-300"
                    : "bg-red-50/60 border-red-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    {log.toolName === "openWhatsApp" && (
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                    )}
                    {log.toolName === "makeCall" && (
                      <PhoneCall className="w-4 h-4 text-blue-600" />
                    )}
                    {log.toolName === "callContact" && (
                      <PhoneCall className="w-4 h-4 text-purple-600" />
                    )}
                    {log.toolName === "openApp" && (
                      <Smartphone className="w-4 h-4 text-amber-600" />
                    )}
                    {log.toolName === "openUrl" && (
                      <ExternalLink className="w-4 h-4 text-cyan-600" />
                    )}
                    <span>{log.toolName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                        isNative
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      <Smartphone className="w-2.5 h-2.5" />
                      {isNative ? "Android Bridge" : "Browser Fallback"}
                    </span>
                    <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {log.timestamp}
                    </span>
                  </div>
                </div>

                <p className="mt-1.5 text-neutral-700 leading-relaxed font-normal">
                  {log.summary}
                </p>

                {/* Details / Raw Args */}
                {log.rawArgs && Object.keys(log.rawArgs).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-neutral-200/60 text-[11px] font-mono text-neutral-600 bg-white/70 p-1.5 rounded-md">
                    <span className="text-neutral-400 font-sans text-[10px] block mb-0.5">
                      Arguments passed:
                    </span>
                    {JSON.stringify(log.rawArgs)}
                  </div>
                )}

                {/* Status footer */}
                <div className="mt-2 flex items-center gap-1 text-[11px]">
                  {isSuccess && (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Executed on device
                    </span>
                  )}
                  {isClarification && (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Multiple matches &bull; Clarifying
                    </span>
                  )}
                  {log.status === "fallback" && (
                    <span className="text-purple-700 font-medium flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> Web sandbox notice
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
