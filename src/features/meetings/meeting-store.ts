import { create } from "zustand";
import { LOCAL_USER_ID } from "@/data/demo-workspace";
import { uid } from "@/lib/utils";
import type { Meeting, MeetingKind } from "@/types/domain";

interface MeetingState {
  meetings: Meeting[];
  /** Meeting the local user is currently in. */
  joinedMeetingId: string | null;
  init: (meetings: Meeting[]) => void;
  start: (input: { title: string; kind: MeetingKind; roomId: string | null }) => Meeting;
  join: (meetingId: string) => void;
  leave: () => void;
  invite: (meetingId: string, userIds: string[]) => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  joinedMeetingId: null,
  init: (meetings) => set({ meetings }),
  start: ({ title, kind, roomId }) => {
    get().leave();
    const meeting: Meeting = { id: uid("mtg"), title, kind, roomId, hostId: LOCAL_USER_ID, participants: [LOCAL_USER_ID], invited: [], status: "active", startTime: Date.now() };
    set((s) => ({ meetings: [meeting, ...s.meetings], joinedMeetingId: meeting.id }));
    return meeting;
  },
  join: (meetingId) => {
    if (get().joinedMeetingId && get().joinedMeetingId !== meetingId) get().leave();
    set((s) => ({
      joinedMeetingId: meetingId,
      meetings: s.meetings.map((m) =>
        m.id !== meetingId ? m : {
          ...m,
          // A scheduled or waiting meeting becomes active when the first person joins.
          status: "active" as const,
          startTime: m.status === "active" ? m.startTime : Date.now(),
          participants: m.participants.includes(LOCAL_USER_ID) ? m.participants : [...m.participants, LOCAL_USER_ID],
        },
      ),
    }));
  },
  leave: () =>
    set((s) => {
      if (!s.joinedMeetingId) return s;
      return {
        joinedMeetingId: null,
        meetings: s.meetings.map((m) => {
          if (m.id !== s.joinedMeetingId) return m;
          const participants = m.participants.filter((p) => p !== LOCAL_USER_ID);
          // The meeting ends when the last participant leaves.
          return participants.length ? { ...m, participants } : { ...m, participants, status: "ended" as const, endTime: Date.now() };
        }),
      };
    }),
  invite: (meetingId, userIds) =>
    set((s) => ({ meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, invited: Array.from(new Set([...m.invited, ...userIds])) } : m)) })),
}));
