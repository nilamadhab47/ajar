export type DeviceState = "off" | "requesting" | "on" | "denied" | "unavailable";
export type MediaTrackKind = "microphone" | "camera" | "screen";
/** `none` = no media transport exists (demo). Never report `connected` without real remote media. */
export type MediaTransportState = "none" | "connecting" | "connected" | "failed";

export interface MediaState {
  microphone: DeviceState;
  camera: DeviceState;
  screen: DeviceState;
  transport: MediaTransportState;
  conversationId: string | null;
  error: string | null;
}

export interface ParticipantTrack {
  userId: string;
  kind: MediaTrackKind;
  track: MediaStreamTrack;
}

/**
 * Vendor-neutral audio/video boundary (WebRTC-compatible). Implement this for
 * an SFU or mesh of your choice; UI code only depends on this interface.
 */
export interface MediaAdapter {
  getState(): MediaState;
  subscribe(listener: (state: MediaState) => void): () => void;
  setMicrophone(enabled: boolean): Promise<void>;
  setCamera(enabled: boolean): Promise<void>;
  setScreenShare(enabled: boolean): Promise<void>;
  /** Local capture streams (camera preview, screen preview). */
  getLocalStream(kind: MediaTrackKind): MediaStream | null;
  /** Remote tracks for a participant. Empty until a real transport is connected. */
  getParticipantTracks(userId: string): ParticipantTrack[];
  joinConversation(conversationId: string, participantIds: string[]): Promise<MediaTransportState>;
  leaveConversation(): Promise<void>;
  dispose(): void;
}
