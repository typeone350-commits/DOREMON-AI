import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import {
  GoogleGenAI,
  Modality,
  Type,
  FunctionDeclaration,
  LiveServerMessage,
} from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Shared GoogleGenAI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Tool Declarations for Gemini Live
const openWhatsAppTool: FunctionDeclaration = {
  name: "openWhatsApp",
  description:
    "Opens WhatsApp or WhatsApp Web. Call this immediately when the user asks to open WhatsApp, regardless of language phrasing (e.g., 'WhatsApp kholo', 'Open WhatsApp', 'WhatsApp open karo', 'WhatsApp chalao', 'Please open my WhatsApp', 'Open my WhatsApp').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: "Optional message text to pre-fill in WhatsApp.",
      },
      phoneNumber: {
        type: Type.STRING,
        description: "Optional phone number with country code to start chat on WhatsApp.",
      },
    },
  },
};

const openAppTool: FunctionDeclaration = {
  name: "openApp",
  description:
    "Opens an installed application on the user's device such as YouTube, Instagram, Chrome, Settings, Camera, Maps, Spotify, Clock, or Calculator. Call this whenever the user asks to open any application (e.g., 'Open YouTube', 'YouTube kholo', 'Open Instagram', 'Instagram open karo', 'Open settings', 'Settings kholo', 'Open Chrome').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description:
          "The name of the application to open, e.g., 'YouTube', 'Instagram', 'Chrome', 'Settings', 'Camera', 'Maps', 'Spotify', 'Clock', 'Calculator'.",
      },
    },
    required: ["appName"],
  },
};

const openUrlTool: FunctionDeclaration = {
  name: "openUrl",
  description:
    "Opens a specific web address or URL in the browser (e.g., 'https://google.com', 'https://wikipedia.org').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The complete web address or search URL to open.",
      },
    },
    required: ["url"],
  },
};

const makeCallTool: FunctionDeclaration = {
  name: "makeCall",
  description:
    "Initiates a phone call to a given numeric phone number. Call this when the user explicitly provides a telephone number to call (e.g., 'Call 9876543210', 'Dial 9876543210', '9876543210 par call lagao').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: {
        type: Type.STRING,
        description: "The phone number to dial.",
      },
    },
    required: ["phoneNumber"],
  },
};

const callContactTool: FunctionDeclaration = {
  name: "callContact",
  description:
    "Looks up a person or contact name in the device's contacts book and initiates a phone call. Call this whenever the user asks to call a person or relationship by name (e.g., 'Call Mom', 'Call Mummy', 'Mummy ko call karo', 'Mom ko phone lagao', 'Call Rahul', 'Rahul ko call karo', 'Call Dad', 'Papa ko phone lagao', 'Call Priya').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: {
        type: Type.STRING,
        description:
          "The contact name or relation mentioned by the user (e.g. 'Mom', 'Mummy', 'Rahul', 'Dad', 'Priya').",
      },
    },
    required: ["contactName"],
  },
};

const SYSTEM_INSTRUCTION = `
You are Doremon (also called Arushi / Doremon AI Assistant), the beloved, cheerful, high-tech robotic cat companion from the 22nd century.

CRITICAL MULTI-LANGUAGE RULES:
- You must understand and speak naturally in whatever language the user speaks.
- Supported languages include: Hindi, English, Hinglish (blend of Hindi & English), Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu, and all other languages supported by Gemini Live.
- Automatically detect the spoken language. Do NOT ask the user to pick a language manually.
- If user speaks Hindi -> Respond in authentic, friendly Hindi (e.g., "Haan dost! Main abhi karta hoon!").
- If user speaks English -> Respond in natural, warm English (e.g., "Right away! I'm on it!").
- If user speaks Hinglish -> Respond naturally in lively Hinglish (e.g., "Haan bilkul! Main abhi WhatsApp open kar deta hoon!").
- If user switches languages mid-conversation, switch immediately with zero hesitation.
- All responses must be delivered as live voice. Never say markdown syntax, bullets, or asterisks out loud.

CRITICAL APP CONTROL & FUNCTION CALLING RULES:
You must actually execute actions using your tools—NEVER just verbally claim an action was done without executing the function!
Whenever the user asks to:
1. Open WhatsApp ("WhatsApp kholo", "Open WhatsApp", "WhatsApp open karo", "WhatsApp chalao", "Can you open WhatsApp?", "Open my WhatsApp") -> CALL TOOL: openWhatsApp()
2. Open an app like YouTube, Instagram, Chrome, Settings, Camera, Maps ("Open YouTube", "YouTube kholo", "Open Instagram", "Open settings", "Settings open karo", "Open Chrome") -> CALL TOOL: openApp(appName: "...")
3. Open a website or URL ("Open google.com", "Go to website") -> CALL TOOL: openUrl(url: "...")
4. Call a numeric phone number ("Call 9876543210", "Dial 9876543210") -> CALL TOOL: makeCall(phoneNumber: "9876543210")
5. Call a contact by name or relation ("Call Mom", "Call Mummy", "Mummy ko call karo", "Mom ko phone lagao", "Call Rahul", "Rahul ko call karo", "Call Dad") -> CALL TOOL: callContact(contactName: "...")

HANDLING TOOL RESPONSES:
Once you receive the tool execution response:
- For makeCall / callContact:
  - If a contact match was found and call initiated: Confirm warmly with the contact's name and say you are calling them (e.g. "Calling Mom now!", "Mummy ko call laga raha hoon!").
  - If multiple contacts match (e.g. multiple Rahuls like Rahul Sharma and Rahul Verma): Inform the user about the candidates and ask which one they want to call (e.g., "I found two contacts for Rahul: Rahul Sharma and Rahul Verma. Which one should I call?", "Mujhe do Rahul mile hain: Rahul Sharma aur Rahul Verma. Kisko call lagana hai?").
  - If no contact was found: State clearly that the contact wasn't found in the contacts list. NEVER guess or invent a phone number.
- For openWhatsApp:
  - If successful: cheerfully confirm (e.g., "WhatsApp khol diya hai!", "Opening WhatsApp for you!").
  - If WhatsApp is not available or blocked: explain gracefully.
- For openApp:
  - If successful: confirm opening the app cheerfully.
  - If native Android bridge is not available for private system apps (like device Settings in a web browser): explain courteously that device settings requires the Android app wrapper.

Keep your spoken replies concise, enthusiastic, and conversational so the user enjoys fast, delightful voice interaction.
`;

app.use(express.json({ limit: "15mb" }));

// Active SSE / HTTP sessions
const activeSessions = new Map<string, { session: any; res: express.Response }>();

// Health check API endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    name: "Doremon AI Assistant",
  });
});

// SSE endpoint for Gemini Live streaming (works seamlessly in all iframes and proxies)
app.get("/api/live/stream", async (req, res) => {
  const sessionId =
    (req.query.sessionId as string) ||
    "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Inform client of session ID
  res.write(`data: ${JSON.stringify({ type: "session_created", sessionId })}\n\n`);

  if (!process.env.GEMINI_API_KEY) {
    res.write(
      `data: ${JSON.stringify({
        type: "status",
        status: "error",
        message: "GEMINI_API_KEY is not set in environment.",
      })}\n\n`
    );
    return;
  }

  let session: any = null;
  let isClosing = false;

  try {
    res.write(
      `data: ${JSON.stringify({
        type: "status",
        status: "connecting",
        message: "Connecting to Gemini Live audio session...",
      })}\n\n`
    );

    session = await ai.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: [
              openWhatsAppTool,
              openAppTool,
              openUrlTool,
              makeCallTool,
              callContactTool,
            ],
          },
        ],
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (isClosing) return;

          // Forward audio chunks
          const parts = message.serverContent?.modelTurn?.parts ?? [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              res.write(
                `data: ${JSON.stringify({
                  type: "audio",
                  audio: part.inlineData.data,
                })}\n\n`
              );
            }
            if (part.text) {
              res.write(
                `data: ${JSON.stringify({
                  type: "transcript",
                  role: "model",
                  text: part.text,
                })}\n\n`
              );
            }
          }

          // Forward interruption signal
          if (message.serverContent?.interrupted) {
            res.write(
              `data: ${JSON.stringify({
                type: "interrupted",
              })}\n\n`
            );
          }

          // Forward tool calls
          const toolCall = message.toolCall;
          if (toolCall?.functionCalls && toolCall.functionCalls.length > 0) {
            for (const call of toolCall.functionCalls) {
              console.log("[SSE ToolCall from Gemini]:", call.name, call.args);
              res.write(
                `data: ${JSON.stringify({
                  type: "tool_call",
                  callId: call.id,
                  name: call.name,
                  args: call.args || {},
                })}\n\n`
              );
            }
          }
        },
        onclose: () => {
          if (!isClosing) {
            res.write(
              `data: ${JSON.stringify({
                type: "status",
                status: "closed",
                message: "Gemini Live session closed.",
              })}\n\n`
            );
          }
        },
        onerror: (err: any) => {
          console.warn("[SSE Gemini Live error]:", err);
          if (!isClosing) {
            res.write(
              `data: ${JSON.stringify({
                type: "status",
                status: "error",
                message: err?.message || "Live API error occurred.",
              })}\n\n`
            );
          }
        },
      },
    });

    activeSessions.set(sessionId, { session, res });

    res.write(
      `data: ${JSON.stringify({
        type: "status",
        status: "connected",
        message: "Gemini Live connected. Doremon is listening!",
      })}\n\n`
    );

    req.on("close", () => {
      isClosing = true;
      try {
        if (session) session.close();
      } catch (_) {}
      activeSessions.delete(sessionId);
    });
  } catch (err: any) {
    console.warn("[SSE Session connect failed]:", err);
    res.write(
      `data: ${JSON.stringify({
        type: "status",
        status: "error",
        message:
          err?.message ||
          "Failed to establish Gemini Live connection. Please check your API key.",
      })}\n\n`
    );
  }
});

// Endpoint to send audio chunks, text turns, or tool responses to an active session
app.post("/api/live/input", (req, res) => {
  const { sessionId, type, audio, text, callId, name, response } = req.body || {};
  const item = activeSessions.get(sessionId);

  if (!item || !item.session) {
    return res.status(404).json({ error: "Session not found or closed" });
  }

  try {
    if (type === "audio" && audio) {
      item.session.sendRealtimeInput({
        audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
      });
    } else if (type === "text" && text) {
      item.session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
    } else if (type === "tool_response" && callId) {
      console.log("[SSE ToolResponse to Gemini]:", name, callId, response);
      item.session.sendToolResponse({
        functionResponses: [
          {
            id: callId,
            name: name,
            response: response || { success: true },
          },
        ],
      });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.warn("[Live input error]:", err);
    res.status(500).json({ error: err?.message || "Failed to process input" });
  }
});

// WebSocket handling for Gemini Live sessions
wss.on("connection", async (clientWs: WebSocket) => {
  console.log("[WS] Client connected to /live");

  if (!process.env.GEMINI_API_KEY) {
    clientWs.send(
      JSON.stringify({
        type: "status",
        status: "error",
        message: "GEMINI_API_KEY is not set in environment.",
      })
    );
    return;
  }

  let session: any = null;
  let isClosing = false;

  try {
    clientWs.send(
      JSON.stringify({
        type: "status",
        status: "connecting",
        message: "Connecting to Gemini Live audio session...",
      })
    );

    session = await ai.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: [
              openWhatsAppTool,
              openAppTool,
              openUrlTool,
              makeCallTool,
              callContactTool,
            ],
          },
        ],
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (isClosing || clientWs.readyState !== WebSocket.OPEN) return;

          // Handle audio parts
          const parts = message.serverContent?.modelTurn?.parts ?? [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              clientWs.send(
                JSON.stringify({
                  type: "audio",
                  audio: part.inlineData.data,
                })
              );
            }
            if (part.text) {
              clientWs.send(
                JSON.stringify({
                  type: "transcript",
                  role: "model",
                  text: part.text,
                })
              );
            }
          }

          // Handle interruption signal from Gemini's built-in VAD
          if (message.serverContent?.interrupted) {
            clientWs.send(
              JSON.stringify({
                type: "interrupted",
              })
            );
          }

          // Handle function / tool calling
          const toolCall = message.toolCall;
          if (toolCall?.functionCalls && toolCall.functionCalls.length > 0) {
            for (const call of toolCall.functionCalls) {
              console.log("[ToolCall from Gemini]:", call.name, call.args);
              clientWs.send(
                JSON.stringify({
                  type: "tool_call",
                  callId: call.id,
                  name: call.name,
                  args: call.args || {},
                })
              );
            }
          }
        },
        onclose: () => {
          if (!isClosing && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "status",
                status: "closed",
                message: "Gemini Live session closed.",
              })
            );
          }
        },
        onerror: (err: any) => {
          console.error("[Gemini Live error]:", err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "status",
                status: "error",
                message: err?.message || "Live API error occurred.",
              })
            );
          }
        },
      },
    });

    clientWs.send(
      JSON.stringify({
        type: "status",
        status: "connected",
        message: "Gemini Live connected. Doremon is listening!",
      })
    );
  } catch (err: any) {
    console.error("[Session connect failed]:", err);
    clientWs.send(
      JSON.stringify({
        type: "status",
        status: "error",
        message:
          err?.message ||
          "Failed to establish Gemini Live connection. Please check your API key.",
      })
    );
    return;
  }

  // Handle messages from client
  clientWs.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // Live microphone audio chunk
      if (msg.type === "audio" && msg.audio && session) {
        session.sendRealtimeInput({
          audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
        });
      }

      // Quick test / text command fallback
      if (msg.type === "text" && msg.text && session) {
        session.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text: msg.text }],
            },
          ],
          turnComplete: true,
        });
      }

      // Client tool execution response
      if (msg.type === "tool_response" && msg.callId && session) {
        console.log(
          "[ToolResponse to Gemini]:",
          msg.name,
          msg.callId,
          msg.response
        );
        session.sendToolResponse({
          functionResponses: [
            {
              id: msg.callId,
              name: msg.name,
              response: msg.response || { success: true },
            },
          ],
        });
      }
    } catch (e) {
      console.error("[WS Message Error]:", e);
    }
  });

  clientWs.on("close", () => {
    isClosing = true;
    try {
      if (session) {
        session.close();
      }
    } catch (_) {}
  });
});

// Vite middleware or static serving
async function setupVite() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Doremon AI Assistant server listening on port ${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
