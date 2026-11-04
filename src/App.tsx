import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Phone,
  Smartphone,
  Sparkles,
  Wifi,
  WifiOff,
  AlertCircle,
  Volume2,
  Square,
  Globe,
  Settings,
  BookUser,
} from "lucide-react";
import { DoremonAvatar } from "./components/DoremonAvatar";
import { QuickTestPanel } from "./components/QuickTestPanel";
import { ActionHistory } from "./components/ActionHistory";
import { ContactsModal } from "./components/ContactsModal";
import { NativeBridgeModal } from "./components/NativeBridgeModal";
import {
  DEFAULT_CONTACTS,
  executeDeviceAction,
  isNativeAndroidBridgeAvailable,
} from "./services/actionBridge";
import { LiveAudioPlayer, float32ToPcm16Base64 } from "./services/audioUtils";
import { Contact, ActionLogItem, ConnectionState } from "./types";

export default function App() {
  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [modelSpeakingVolume, setModelSpeakingVolume] = useState<number>(0);
  const [userMicVolume, setUserMicVolume] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);
  const [simulateBridge, setSimulateBridge] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<{ message: string; type: string } | null>(null);

  // Spoken transcripts
  const [latestModelText, setLatestModelText] = useState<string>(
    "Hello! Main Doremon hoon. Ask me anything in Hindi, English, Hinglish, or any language!"
  );
  const [latestUserText, setLatestUserText] = useState<string>("");

  // Contacts & Action Logs
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem("doremon_contacts");
      return saved ? JSON.parse(saved) : DEFAULT_CONTACTS;
    } catch (_) {
      return DEFAULT_CONTACTS;
    }
  });

  const [actionLogs, setActionLogs] = useState<ActionLogItem[]>([]);

  // Modals
  const [isContactsOpen, setIsContactsOpen] = useState<boolean>(false);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState<boolean>(false);

  // Refs for audio pipeline & live session connection
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioPlayerRef = useRef<LiveAudioPlayer | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const contactsRef = useRef<Contact[]>(contacts);
  const simulateBridgeRef = useRef<boolean>(simulateBridge);

  // Sync refs
  useEffect(() => {
    contactsRef.current = contacts;
    try {
      localStorage.setItem("doremon_contacts", JSON.stringify(contacts));
    } catch (_) {}
  }, [contacts]);

  useEffect(() => {
    simulateBridgeRef.current = simulateBridge;
  }, [simulateBridge]);

  // Toast auto-dismiss
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Audio player initialization
  useEffect(() => {
    audioPlayerRef.current = new LiveAudioPlayer((vol) => {
      setModelSpeakingVolume(vol);
      setIsSpeaking(vol > 0.05);
    });

    return () => {
      audioPlayerRef.current?.close();
      stopMicrophone();
    };
  }, []);

  // Send input (audio chunk, text prompt, or tool response) to backend live session
  const sendLiveInput = useCallback(async (payload: Record<string, any>) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      console.warn("[sendLiveInput] Session not ready yet");
      return;
    }

    try {
      await fetch("/api/live/input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          ...payload,
        }),
      });
    } catch (err) {
      console.warn("[sendLiveInput error]:", err);
    }
  }, []);

  // Connect SSE to backend Gemini Live session (safe in all browsers, iframes, and proxies)
  const connectLiveSession = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState("connecting");
    setErrorMessage(null);

    const sse = new EventSource("/api/live/stream");
    eventSourceRef.current = sse;

    sse.onopen = () => {
      console.log("[Live SSE] Connection opened");
    };

    sse.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "session_created" && data.sessionId) {
          sessionIdRef.current = data.sessionId;
        }

        if (data.type === "status") {
          setConnectionState(data.status);
          if (data.status === "error") {
            setErrorMessage(data.message);
          } else {
            setErrorMessage(null);
          }
        }

        // Live Model Audio Chunk (24kHz PCM)
        if (data.type === "audio" && data.audio) {
          audioPlayerRef.current?.enqueuePcmChunk(data.audio);
        }

        // Interruption signal from Gemini Live VAD
        if (data.type === "interrupted") {
          console.log("[Interrupted by Gemini VAD]");
          audioPlayerRef.current?.interrupt();
          setIsSpeaking(false);
          setModelSpeakingVolume(0);
        }

        // Spoken transcript updates
        if (data.type === "transcript") {
          if (data.role === "model") {
            setLatestModelText((prev) => (prev ? prev + " " + data.text : data.text));
          } else if (data.role === "user") {
            setLatestUserText(data.text);
          }
        }

        // Function / Tool Call from Gemini
        if (data.type === "tool_call") {
          console.log("[Tool Call Received]:", data.name, data.args);
          setIsActionInProgress(true);

          // Execute action via Native Android Bridge or Safe Web Fallback
          const result = await executeDeviceAction(
            data.name,
            data.args || {},
            contactsRef.current,
            simulateBridgeRef.current
          );

          // Record action in logs
          const logEntry: ActionLogItem = {
            id: "act_" + Date.now(),
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            toolName: data.name,
            rawArgs: data.args || {},
            status: result.status,
            platform: result.platform,
            summary: result.message,
            details: result.details,
          };

          setActionLogs((prev) => [logEntry, ...prev]);

          setActiveToast({
            message: result.message,
            type: result.status,
          });

          // Send tool response back to Gemini session
          await sendLiveInput({
            type: "tool_response",
            callId: data.callId,
            name: data.name,
            response: {
              success: result.success,
              platform: result.platform,
              message: result.message,
              details: result.details,
            },
          });

          setTimeout(() => setIsActionInProgress(false), 800);
        }
      } catch (e) {
        console.warn("[Live SSE message parse error]:", e);
      }
    };

    sse.onerror = () => {
      // Graceful error handling (avoid console.error to prevent false uncaught error reports in preview)
      console.warn("[Live SSE notice]: Reconnecting stream...");
      setConnectionState((prev) => (prev === "connected" ? "connecting" : prev));
    };
  }, [sendLiveInput]);

  // Connect on initial load
  useEffect(() => {
    connectLiveSession();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectLiveSession]);

  // Start capturing 16kHz microphone audio
  const startMicrophone = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Microphone access is not supported by your browser.");
        return;
      }

      // Ensure AudioContext is created
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtxClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const source = inputCtx.createMediaStreamSource(stream);
      // 4096 frames at 16000Hz = ~256ms chunk
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Compute volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const avg = sum / inputData.length;
        setUserMicVolume(Math.min(1, avg * 8));

        // Convert to 16-bit PCM Base64 and send to Live backend
        const base64Audio = float32ToPcm16Base64(inputData);
        sendLiveInput({
          type: "audio",
          audio: base64Audio,
        });
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
      setIsMicActive(true);
      setErrorMessage(null);
    } catch (err: any) {
      console.warn("[Microphone start notice]:", err);
      setErrorMessage(
        err?.name === "NotAllowedError"
          ? "Microphone permission was denied. Please allow microphone in browser settings."
          : `Failed to access microphone: ${err?.message || err}`
      );
      setIsMicActive(false);
    }
  };

  // Stop capturing microphone
  const stopMicrophone = () => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== "closed") {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    setIsMicActive(false);
    setUserMicVolume(0);
  };

  // Toggle Microphone
  const toggleMicrophone = async () => {
    if (isMicActive) {
      stopMicrophone();
    } else {
      if (connectionState !== "connected") {
        connectLiveSession();
      }
      await startMicrophone();
    }
  };

  // Interrupt Arushi
  const handleInterrupt = () => {
    audioPlayerRef.current?.interrupt();
    setIsSpeaking(false);
    setModelSpeakingVolume(0);
    sendLiveInput({ type: "interrupt" });
  };

  // Send quick prompt
  const handleSendPrompt = (promptText: string) => {
    setLatestUserText(promptText);
    setLatestModelText("");

    if (connectionState !== "connected") {
      connectLiveSession();
      setTimeout(() => {
        sendLiveInput({
          type: "text",
          text: promptText,
        });
      }, 1000);
    } else {
      sendLiveInput({
        type: "text",
        text: promptText,
      });
    }
  };

  // Direct call handler from modal
  const handleDirectCall = async (phone: string) => {
    const res = await executeDeviceAction(
      "makeCall",
      { phoneNumber: phone },
      contacts,
      simulateBridge
    );
    setActionLogs((prev) => [
      {
        id: "act_" + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        toolName: "makeCall",
        rawArgs: { phoneNumber: phone },
        status: res.status,
        platform: res.platform,
        summary: res.message,
      },
      ...prev,
    ]);
    setActiveToast({ message: res.message, type: res.status });
  };

  const isRealNative = isNativeAndroidBridgeAvailable();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF5FB] via-[#F4F9FD] to-[#E3EFF9] text-neutral-800 font-sans flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0081C6] to-[#00A2E8] p-1.5 shadow-md flex items-center justify-center text-white">
              <span className="text-xl">🔔</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base md:text-lg text-neutral-900 tracking-tight font-['Fredoka']">
                  Doremon <span className="text-blue-600">AI</span> Assistant
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wide">
                  Live Voice
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 hidden sm:block">
                Multilingual Voice-to-Voice with Android App Control
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Bridge Status Indicator */}
            <button
              onClick={() => setIsBridgeModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isRealNative || simulateBridge
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isRealNative
                  ? "Native APK Bridge"
                  : simulateBridge
                  ? "Simulated APK Bridge"
                  : "Browser Deep Links"}
              </span>
              <span className="md:hidden">Bridge</span>
            </button>

            {/* Contacts Button */}
            <button
              onClick={() => setIsContactsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-2xs transition-colors"
            >
              <BookUser className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Contacts</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {contacts.length}
              </span>
            </button>

            {/* Live Connection Pill */}
            <button
              onClick={connectLiveSession}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                connectionState === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : connectionState === "connecting"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              {connectionState === "connected" ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : connectionState === "connecting" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="hidden sm:inline">Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reconnect</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 py-5 flex-1 flex flex-col gap-5">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:underline font-bold shrink-0 ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Toast Alert */}
        {activeToast && (
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between text-xs shadow-md animate-in slide-in-from-top-3 duration-200 ${
              activeToast.type === "clarification"
                ? "bg-amber-500 text-white border-amber-600"
                : activeToast.type === "fallback"
                ? "bg-purple-600 text-white border-purple-700"
                : "bg-emerald-600 text-white border-emerald-700"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4" />
              <span>{activeToast.message}</span>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-white/80 hover:text-white font-bold ml-3"
            >
              &times;
            </button>
          </div>
        )}

        {/* Hero Doremon Stage */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 flex flex-col items-center relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute top-0 w-96 h-48 bg-gradient-to-b from-blue-100/60 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Languages Supported Banner */}
          <div className="w-full max-w-xl flex flex-wrap items-center justify-center gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1 mr-1">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Auto-Language Detect:
            </span>
            {[
              "Hindi",
              "Hinglish",
              "English",
              "Marathi",
              "Bengali",
              "Tamil",
              "Telugu",
              "Gujarati",
              "Kannada",
              "Punjabi",
              "Urdu",
            ].map((lang) => (
              <span
                key={lang}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/60"
              >
                {lang}
              </span>
            ))}
          </div>

          {/* Doremon Character Avatar */}
          <DoremonAvatar
            volume={modelSpeakingVolume}
            isListening={isMicActive}
            isSpeaking={isSpeaking}
            isActionInProgress={isActionInProgress}
            statusText={
              isActionInProgress
                ? "Executing device action..."
                : isSpeaking
                ? "Doremon is speaking..."
                : isMicActive
                ? "Listening to your voice..."
                : "Tap the microphone to speak"
            }
          />

          {/* Real-time Spoken Transcript Card */}
          <div className="w-full max-w-lg mt-3 p-3.5 rounded-2xl bg-neutral-50/90 border border-neutral-200 text-center">
            {latestUserText && (
              <div className="mb-2 text-xs text-neutral-500 font-medium">
                <span className="font-bold text-neutral-700">You:</span> &ldquo;{latestUserText}&rdquo;
              </div>
            )}
            <p className="text-xs md:text-sm text-neutral-800 font-medium leading-relaxed italic">
              &ldquo;{latestModelText || "Listening..."}&rdquo;
            </p>
          </div>

          {/* Central Mic & Control Bar */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {/* Main Microphone Button */}
            <button
              onClick={toggleMicrophone}
              className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all transform active:scale-95 ${
                isMicActive
                  ? "bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-200"
                  : "bg-gradient-to-tr from-[#0081C6] to-[#00A2E8] hover:from-[#0074B2] hover:to-[#0092D0] text-white ring-4 ring-blue-100"
              }`}
            >
              {isMicActive ? (
                <MicOff className="w-7 h-7" />
              ) : (
                <Mic className="w-7 h-7" />
              )}

              {/* Pulsing visualizer ring around mic */}
              {isMicActive && (
                <div
                  className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping pointer-events-none"
                  style={{
                    animationDuration: `${Math.max(0.6, 2 - userMicVolume * 2)}s`,
                  }}
                />
              )}
            </button>

            {/* Interrupt button if speaking */}
            {isSpeaking && (
              <button
                onClick={handleInterrupt}
                title="Interrupt Doremon while speaking (Test Case #10)"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Speaking</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 mt-2">
            {isMicActive
              ? "Microphone is ON. Speak freely in Hindi, Hinglish, or English!"
              : "Click the mic button to start real-time voice conversation"}
          </p>
        </section>

        {/* Lower Grid: Test Suite & Live Device Action Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">
          {/* Left Column: Quick Test Suite */}
          <QuickTestPanel
            onSendPrompt={handleSendPrompt}
            onInterrupt={handleInterrupt}
            isSpeaking={isSpeaking}
            isConnected={connectionState === "connected"}
          />

          {/* Right Column: Live Action History */}
          <ActionHistory
            logs={actionLogs}
            onClearLogs={() => setActionLogs([])}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-blue-100 bg-white/70 py-3 px-4 text-center text-xs text-neutral-500">
        <p>
          Doremon AI Assistant &bull; True Voice-to-Voice powered by Gemini Live API &bull; Android Bridge &amp; Web Action Dispatcher
        </p>
      </footer>

      {/* Modals */}
      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        contacts={contacts}
        onAddContact={(newContact) => setContacts((prev) => [newContact, ...prev])}
        onDeleteContact={(id) => setContacts((prev) => prev.filter((c) => c.id !== id))}
        onDirectCall={handleDirectCall}
      />

      <NativeBridgeModal
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
        simulateBridge={simulateBridge}
        onToggleSimulateBridge={(val) => setSimulateBridge(val)}
      />
    </div>
  );
}
