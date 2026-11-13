"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { STARTER_DESKS } from "@/features/auth/starter-desks";
import { authInputClass } from "@/features/auth/auth-shell";
import { useWorldStore } from "@/features/world/world-store";
import { env } from "@/lib/env";
import { apiRequest } from "@/services/api/api-client";
import { useUiStore } from "@/stores/ui-store";
import { usePlaceStore } from "../place-store";
import { OFFICE_AREAS, OFFICE_ROOM_IDS, type OfficePlace } from "../places";

const close = () => useUiStore.getState().closeDialog();

/** The owner renames an area and leaves one line on an area, a room, or a desk. */
export function LabelsDialog({ workspaceId }: { workspaceId: string }) {
  const rooms = useWorldStore((s) => s.rooms);
  const saved = usePlaceStore((s) => s.places);
  const [areas, setAreas] = useState(() =>
    OFFICE_AREAS.map((area) => {
      const place = saved.find((item) => item.kind === "area" && item.id === area.id);
      return { ...area, name: place?.name ?? "", note: place?.note ?? "" };
    }),
  );
  const [roomId, setRoomId] = useState("");
  const [roomNote, setRoomNote] = useState("");
  const [deskId, setDeskId] = useState("");
  const [deskNote, setDeskNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const chooseRoom = (id: string) => {
    setRoomId(id);
    setRoomNote(saved.find((place) => place.kind === "room" && place.id === id)?.note ?? "");
  };
  const chooseDesk = (id: string) => {
    setDeskId(id);
    setDeskNote(saved.find((place) => place.kind === "desk" && place.id === id)?.note ?? "");
  };

  const save = async () => {
    if (!env.apiBaseUrl) return;
    setSaving(true);
    setError("");
    try {
      const written: OfficePlace[] = [];
      for (const area of areas) {
        written.push(await savePlace(workspaceId, "area", area.id, area.name, area.note));
      }
      if (roomId) written.push(await savePlace(workspaceId, "room", roomId, "", roomNote));
      if (deskId) written.push(await savePlace(workspaceId, "desk", deskId, "", deskNote));
      const next = new Map(saved.map((place) => [`${place.kind}:${place.id}`, place]));
      for (const place of written) {
        if (!place.name && !place.note) next.delete(`${place.kind}:${place.id}`);
        else next.set(`${place.kind}:${place.id}`, place);
      }
      usePlaceStore.getState().setPlaces([...next.values()]);
      useUiStore.getState().toast({ title: "Labels saved", tone: "success" });
      close();
    } catch {
      setError("Those labels could not be saved.");
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={close} title="Labels" description="Rename an area, or leave one line on a room or a desk. The walls stay where they are.">
      <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-medium uppercase tracking-wide text-muted">Areas</legend>
          {areas.map((area) => (
            <div key={area.id} className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium">
                {OFFICE_AREAS.find((item) => item.id === area.id)?.name}
                <input
                  id={`area-name-${area.id}`}
                  maxLength={40}
                  value={area.name}
                  placeholder={OFFICE_AREAS.find((item) => item.id === area.id)?.name}
                  onChange={(event) => setAreas((current) => current.map((item) => item.id === area.id ? { ...item, name: event.target.value } : item))}
                  className={`${authInputClass} mt-1`}
                />
              </label>
              <label className="block text-xs font-medium">
                One line
                <input
                  id={`area-note-${area.id}`}
                  maxLength={140}
                  value={area.note}
                  onChange={(event) => setAreas((current) => current.map((item) => item.id === area.id ? { ...item, note: event.target.value } : item))}
                  className={`${authInputClass} mt-1`}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <label className="block text-xs font-medium" htmlFor="place-room">Room</label>
        <select id="place-room" value={roomId} onChange={(event) => chooseRoom(event.target.value)} className={authInputClass}>
          <option value="">Choose a room</option>
          {rooms.filter((room) => OFFICE_ROOM_IDS.has(room.id)).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
        {roomId && (
          <input id="place-room-note" maxLength={140} value={roomNote} placeholder="One line about this room" onChange={(event) => setRoomNote(event.target.value)} className={authInputClass} />
        )}

        <label className="block text-xs font-medium" htmlFor="place-desk">Desk</label>
        <select id="place-desk" value={deskId} onChange={(event) => chooseDesk(event.target.value)} className={authInputClass}>
          <option value="">Choose a desk</option>
          {STARTER_DESKS.map((desk) => <option key={desk.id} value={desk.id}>{desk.area} · {desk.id}</option>)}
        </select>
        {deskId && (
          <input id="place-desk-note" maxLength={140} value={deskNote} placeholder="One line about this desk" onChange={(event) => setDeskNote(event.target.value)} className={authInputClass} />
        )}

        {error && <p className="text-sm text-dnd" role="alert">{error}</p>}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save labels"}</Button>
      </form>
    </Dialog>
  );
}

async function savePlace(workspaceId: string, kind: string, id: string, name: string, note: string): Promise<OfficePlace> {
  return apiRequest<OfficePlace>(`/workspaces/${workspaceId}/places/${kind}/${encodeURIComponent(id)}`, {
    method: "PUT",
    json: { name: name.trim() || null, note: note.trim() || null },
  });
}
