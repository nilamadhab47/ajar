import type { DeviceState, MediaAdapter, MediaState, MediaTrackKind, MediaTransportState, ParticipantTrack } from "./media-adapter";

/**
 * Demo media adapter: real local capture (microphone, camera, screen) through
 * browser permissions, but no signalling and therefore no remote media. It
 * always reports transport `none` so the UI can say so honestly.
 */
export class LocalOnlyMediaAdapter implements MediaAdapter {
  private state: MediaState = { microphone: "off", camera: "off", screen: "off", transport: "none", conversationId: null, error: null };
  private streams: Partial<Record<MediaTrackKind, MediaStream>> = {};
  private listeners = new Set<(state: MediaState) => void>();

  getState(): MediaState {
    return this.state;
  }
  subscribe(listener: (state: MediaState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private patch(patch: Partial<MediaState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }
  private stop(kind: MediaTrackKind): void {
    this.streams[kind]?.getTracks().forEach((t) => t.stop());
    delete this.streams[kind];
    this.patch({ [kind]: "off" } as Partial<MediaState>);
  }

  private async capture(kind: MediaTrackKind, request: () => Promise<MediaStream>): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      this.patch({ [kind]: "unavailable", error: "Media devices are not available in this browser context." } as Partial<MediaState>);
      return;
    }
    this.patch({ [kind]: "requesting", error: null } as Partial<MediaState>);
    try {
      const stream = await request();
      this.streams[kind] = stream;
      stream.getTracks().forEach((t) => t.addEventListener("ended", () => this.streams[kind] === stream && this.stop(kind)));
      this.patch({ [kind]: "on" } as Partial<MediaState>);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      const denied = name === "NotAllowedError" || name === "SecurityError";
      const next: DeviceState = denied ? (kind === "screen" ? "off" : "denied") : name === "AbortError" ? "off" : "unavailable";
      const label = kind === "screen" ? "Screen sharing" : kind === "camera" ? "Camera" : "Microphone";
      this.patch({
        [kind]: next,
        error: next === "off" ? null : denied ? `${label} permission was denied. Allow it in your browser's site settings.` : `${label} is unavailable on this device.`,
      } as Partial<MediaState>);
    }
  }

  async setMicrophone(enabled: boolean): Promise<void> {
    if (!enabled) return this.stop("microphone");
    await this.capture("microphone", () => navigator.mediaDevices.getUserMedia({ audio: true }));
  }
  async setCamera(enabled: boolean): Promise<void> {
    if (!enabled) return this.stop("camera");
    await this.capture("camera", () => navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } }));
  }
  async setScreenShare(enabled: boolean): Promise<void> {
    if (!enabled) return this.stop("screen");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      this.patch({ screen: "unavailable", error: "Screen capture is not supported in this browser." });
      return;
    }
    await this.capture("screen", () => navigator.mediaDevices.getDisplayMedia({ video: true }));
  }

  getLocalStream(kind: MediaTrackKind): MediaStream | null {
    return this.streams[kind] ?? null;
  }
  getParticipantTracks(): ParticipantTrack[] {
    return [];
  }
  async joinConversation(conversationId: string): Promise<MediaTransportState> {
    this.patch({ conversationId, transport: "none" });
    return "none";
  }
  async leaveConversation(): Promise<void> {
    this.patch({ conversationId: null, transport: "none" });
  }
  dispose(): void {
    (["microphone", "camera", "screen"] as const).forEach((k) => this.streams[k] && this.stop(k));
    this.listeners.clear();
  }
}
