import React from "react";
import {
  Sparkles,
  Phone,
  MessageSquare,
  Globe,
  Square,
  Smartphone,
} from "lucide-react";

interface QuickTestPanelProps {
  onSendPrompt: (promptText: string) => void;
  onInterrupt: () => void;
  isSpeaking: boolean;
  isConnected: boolean;
}

export const QuickTestPanel: React.FC<QuickTestPanelProps> = ({
  onSendPrompt,
  onInterrupt,
  isSpeaking,
  isConnected,
}) => {
  const TEST_CASES = [
    {
      id: 1,
      label: "Hello Doremon",
      lang: "Voice Test",
      category: "greeting",
      icon: Sparkles,
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
      description: "Test 1: Audible Gemini Live voice response",
    },
    {
      id: 2,
      label: "Hindi mein baat karo",
      lang: "Hindi",
      category: "language",
      icon: Globe,
      color: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200",
      description: "Test 2: Switches to authentic Hindi",
    },
    {
      id: 3,
      label: "Talk to me in English",
      lang: "English",
      category: "language",
      icon: Globe,
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
      description: "Test 3: Switches to English",
    },
    {
      id: 4,
      label: "Hinglish mein baat karo",
      lang: "Hinglish",
      category: "language",
      icon: Globe,
      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
      description: "Test 4: Natural Hinglish blend",
    },
    {
      id: 5,
      label: "WhatsApp kholo",
      lang: "Hindi / Action",
      category: "action",
      icon: MessageSquare,
      color: "bg-green-50 text-green-700 hover:bg-green-100 border-green-300",
      description: "Test 5: Executes openWhatsApp()",
    },
    {
      id: 6,
      label: "Open WhatsApp",
      lang: "English / Action",
      category: "action",
      icon: MessageSquare,
      color: "bg-green-50 text-green-700 hover:bg-green-100 border-green-300",
      description: "Test 6: Executes openWhatsApp()",
    },
    {
      id: 7,
      label: "Mummy ko call karo",
      lang: "Hinglish / Contact",
      category: "call",
      icon: Phone,
      color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
      description: "Test 7: Finds Mom contact -> dials",
    },
    {
      id: 8,
      label: "Call Rahul",
      lang: "Multi-match",
      category: "call",
      icon: Phone,
      color: "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300",
      description: "Test 8: Finds 2 Rahuls -> asks clarification",
    },
    {
      id: 9,
      label: "Call 9876543210",
      lang: "Numeric Dial",
      category: "call",
      icon: Phone,
      color: "bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200",
      description: "Test 9: Opens phone dialer directly",
    },
    {
      id: 11,
      label: "Open YouTube",
      lang: "App Control",
      category: "action",
      icon: Smartphone,
      color: "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200",
      description: "Executes openApp('YouTube')",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div>
          <h3 className="font-bold text-sm text-neutral-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Quick Test Cases
          </h3>
          <p className="text-[11px] text-neutral-500">
            Click any test command to simulate voice turn
          </p>
        </div>

        {/* Test 10: Interrupt while speaking */}
        <button
          onClick={onInterrupt}
          disabled={!isSpeaking}
          title="Test 10: Interrupt Doremon while speaking"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
            isSpeaking
              ? "bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-red-300"
              : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
          }`}
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Interrupt (#10)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 flex-1 overflow-y-auto max-h-[380px]">
        {TEST_CASES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSendPrompt(item.label)}
              disabled={!isConnected}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                item.color
              } ${
                !isConnected
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <span className="font-bold text-xs group-hover:underline flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  &ldquo;{item.label}&rdquo;
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-white/70 shadow-2xs shrink-0">
                  #{item.id}
                </span>
              </div>
              <p className="text-[10px] opacity-80 mt-1 leading-tight">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
