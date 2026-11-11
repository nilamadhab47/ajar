"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useUser } from "@/features/people/people-store";
import { firstName } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { useKnockStore } from "./knock-store";

/** A closed door takes a note. It never becomes a knock. */
export function NoteDialog({ userId }: { userId: string }) {
  const user = useUser(userId);
  const [text, setText] = useState("");
  const close = () => useUiStore.getState().closeDialog();
  const name = user ? firstName(user.displayName) : "them";
  return (
    <Dialog open onClose={close} title={`Note for ${name}`} description="Their door is closed, so this stays a note.">
      <form
        className="space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) useKnockStore.getState().leaveNote(userId, text);
        }}
      >
        <label className="sr-only" htmlFor="door-note">Note</label>
        <textarea
          id="door-note"
          autoFocus
          maxLength={280}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a short note…"
          className="h-28 w-full resize-none rounded-md border border-line bg-app px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:bg-panel focus:outline-none focus-visible:outline-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-muted">{text.trim().length}/280</span>
          <div className="flex gap-2">
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!text.trim()}>Leave note</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
