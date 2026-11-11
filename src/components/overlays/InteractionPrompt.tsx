"use client";

import { AnimatePresence, motion } from "framer-motion";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { keyLabel, shortcuts } from "@/lib/shortcuts";

/** "[E] Interact" hint for the object in range. Also clickable, for touch and mouse users. */
export function InteractionPrompt() {
  const prompt = useWorldStore((s) => s.prompt);
  const key = keyLabel(shortcuts.getBindings().interact[0] ?? "KeyE");
  return (
    <AnimatePresence>
      {prompt && (
        <motion.button
          key={prompt.objectId} type="button" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }}
          onClick={() => sendWorldCommand({ type: "interact" })}
          className="pointer-events-auto flex items-center gap-2 rounded-lg border border-line bg-panel/95 py-1.5 pl-1.5 pr-3 text-[13px] shadow-float hover:bg-panel"
        >
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-b-2 border-ink/20 bg-app px-1.5 font-sans text-xs font-semibold">{key}</kbd>
          <span className="font-medium">{prompt.action}</span>
          <span className="text-muted">
            {prompt.title}
            {prompt.detail ? ` · ${prompt.detail}` : ""}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
