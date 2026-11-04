import React from "react";
import { motion } from "motion/react";

interface DoremonAvatarProps {
  volume: number; // 0 to 1
  isListening: boolean;
  isSpeaking: boolean;
  isActionInProgress: boolean;
  statusText?: string;
}

export const DoremonAvatar: React.FC<DoremonAvatarProps> = ({
  volume,
  isListening,
  isSpeaking,
  isActionInProgress,
  statusText,
}) => {
  // Mouth opening height based on volume
  const mouthHeight = isSpeaking ? Math.max(12, Math.min(68, volume * 90 + 12)) : 6;
  const mouthWidth = isSpeaking ? Math.max(28, Math.min(54, volume * 40 + 32)) : 32;

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Sound waves radiating when speaking or listening */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isSpeaking && (
          <>
            <motion.div
              animate={{
                scale: [1, 1.4, 1.7],
                opacity: [0.6, 0.3, 0],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute w-64 h-64 rounded-full bg-blue-400/20 blur-sm"
            />
            <motion.div
              animate={{
                scale: [1, 1.25, 1.45],
                opacity: [0.7, 0.35, 0],
              }}
              transition={{
                duration: 1.4,
                delay: 0.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute w-56 h-56 rounded-full bg-cyan-400/25 blur-sm"
            />
          </>
        )}

        {isListening && !isSpeaking && (
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-60 h-60 rounded-full bg-emerald-400/20 blur-md"
          />
        )}
      </div>

      {/* Main Doremon Head */}
      <motion.div
        animate={{
          y: isSpeaking ? [0, -4, 0] : isListening ? [0, -2, 0] : [0, 2, 0],
          rotate: isActionInProgress ? [0, -3, 3, 0] : 0,
        }}
        transition={{
          duration: isSpeaking ? 0.4 : 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-b from-[#00A2E8] to-[#0081C6] shadow-2xl shadow-blue-500/30 flex items-center justify-center p-3 border-4 border-white"
      >
        {/* Whiskers Left */}
        <div className="absolute left-2 top-24 md:top-28 flex flex-col gap-2 z-10">
          <div className="w-8 h-0.5 bg-neutral-800 rotate-[-8deg] origin-right rounded-full" />
          <div className="w-9 h-0.5 bg-neutral-800 rotate-[0deg] origin-right rounded-full" />
          <div className="w-8 h-0.5 bg-neutral-800 rotate-[8deg] origin-right rounded-full" />
        </div>

        {/* Whiskers Right */}
        <div className="absolute right-2 top-24 md:top-28 flex flex-col gap-2 z-10">
          <div className="w-8 h-0.5 bg-neutral-800 rotate-[8deg] origin-left rounded-full" />
          <div className="w-9 h-0.5 bg-neutral-800 rotate-[0deg] origin-left rounded-full" />
          <div className="w-8 h-0.5 bg-neutral-800 rotate-[-8deg] origin-left rounded-full" />
        </div>

        {/* Inner White Face */}
        <div className="relative w-full h-full rounded-full bg-white flex flex-col items-center pt-2 shadow-inner overflow-hidden">
          {/* Doremon Big Anime Eyes */}
          <div className="flex gap-2 items-center justify-center mt-2 z-20">
            {/* Left Eye */}
            <div className="w-10 h-13 md:w-12 md:h-16 bg-white rounded-full border-2 border-neutral-800 flex items-center justify-center relative overflow-hidden shadow-sm">
              <motion.div
                animate={{
                  y: isSpeaking ? [0, 2, 0] : [0, 1, 0],
                  scaleY: isActionInProgress ? [1, 0.2, 1] : 1,
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-4 h-6 md:w-5 md:h-7 bg-neutral-900 rounded-full relative flex items-start justify-end p-0.5 mr-1"
              >
                {/* Eye sparkle highlight */}
                <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
              </motion.div>
            </div>

            {/* Right Eye */}
            <div className="w-10 h-13 md:w-12 md:h-16 bg-white rounded-full border-2 border-neutral-800 flex items-center justify-center relative overflow-hidden shadow-sm">
              <motion.div
                animate={{
                  y: isSpeaking ? [0, 2, 0] : [0, 1, 0],
                  scaleY: isActionInProgress ? [1, 0.2, 1] : 1,
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-4 h-6 md:w-5 md:h-7 bg-neutral-900 rounded-full relative flex items-start justify-start p-0.5 ml-1"
              >
                {/* Eye sparkle highlight */}
                <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
              </motion.div>
            </div>
          </div>

          {/* Red Nose */}
          <div className="relative -mt-2 z-20">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-[#C1121F] to-[#E63946] border-2 border-neutral-800 shadow-md flex items-start justify-start p-1">
              <div className="w-2 h-2 rounded-full bg-white/80" />
            </div>
            {/* Vertical nose line to mouth */}
            <div className="w-0.5 h-4 bg-neutral-800 mx-auto" />
          </div>

          {/* Cute Rosy Blushes */}
          <div className="absolute left-6 top-24 w-6 h-3 rounded-full bg-pink-300/40 blur-xs" />
          <div className="absolute right-6 top-24 w-6 h-3 rounded-full bg-pink-300/40 blur-xs" />

          {/* Animated Mouth */}
          <div className="flex items-center justify-center mt-0 z-20">
            {isSpeaking ? (
              <motion.div
                animate={{
                  height: mouthHeight,
                  width: mouthWidth,
                }}
                transition={{ duration: 0.08 }}
                className="bg-[#D90429] rounded-b-full border-2 border-neutral-800 overflow-hidden relative shadow-inner"
              >
                {/* Pink tongue */}
                <div className="absolute bottom-0 w-full h-1/2 bg-[#FF758F] rounded-t-full" />
              </motion.div>
            ) : (
              // Happy gentle smile when idle/listening
              <div className="w-14 h-4 border-b-3 border-neutral-800 rounded-b-full" />
            )}
          </div>
        </div>

        {/* Action badge floating near ear if action is running */}
        {isActionInProgress && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute -top-2 -right-2 bg-amber-400 text-neutral-900 font-bold text-xs px-2.5 py-1 rounded-full shadow-lg border border-amber-200 flex items-center gap-1 z-30"
          >
            <span>⚡</span> Action!
          </motion.div>
        )}
      </motion.div>

      {/* Red Collar and Golden Bell */}
      <div className="relative -mt-3 flex flex-col items-center z-20">
        {/* Red Collar Ribbon */}
        <div className="w-36 md:w-44 h-4 bg-gradient-to-r from-[#C1121F] via-[#E63946] to-[#C1121F] rounded-full border-2 border-neutral-800 shadow-md" />

        {/* Iconic Golden Bell */}
        <motion.div
          animate={{
            rotate: isSpeaking ? [-8, 8, -8] : [0, 0, 0],
            scale: isSpeaking ? [1, 1.08, 1] : 1,
          }}
          transition={{ duration: 0.35, repeat: Infinity }}
          className="relative -mt-2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-b from-[#FFF07C] via-[#FFDE00] to-[#E0B000] border-2 border-neutral-800 shadow-lg flex flex-col items-center justify-center"
        >
          {/* Bell slit line */}
          <div className="w-full h-0.5 bg-neutral-800 my-auto" />
          {/* Bell hole */}
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700 -mt-1.5" />
          <div className="w-0.5 h-2 bg-neutral-900 -mt-0.5" />
        </motion.div>
      </div>

      {/* Live Status Pill */}
      {statusText && (
        <div className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-neutral-700 shadow-sm border border-neutral-200 flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking
                ? "bg-blue-500 animate-pulse"
                : isListening
                ? "bg-emerald-500 animate-ping"
                : "bg-neutral-400"
            }`}
          />
          {statusText}
        </div>
      )}
    </div>
  );
};
