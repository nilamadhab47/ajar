import { create } from "zustand";
import type { MediaAdapter, MediaState } from "@/services/media/media-adapter";
import { LocalOnlyMediaAdapter } from "@/services/media/mock-media-adapter";

/** Swap this factory to plug in a real WebRTC/SFU adapter. */
let adapter: MediaAdapter | null = null;
export function getMediaAdapter(): MediaAdapter {
  if (!adapter) {
    adapter = new LocalOnlyMediaAdapter();
    adapter.subscribe((state) => useMediaStore.setState({ ...state }));
  }
  return adapter;
}

/** Serializable mirror of the adapter state for React. Streams stay inside the adapter. */
export const useMediaStore = create<MediaState>(() => ({
  microphone: "off", camera: "off", screen: "off", transport: "none", conversationId: null, error: null,
}));

export const mediaActions = {
  toggleMicrophone: () => getMediaAdapter().setMicrophone(useMediaStore.getState().microphone !== "on"),
  toggleCamera: () => getMediaAdapter().setCamera(useMediaStore.getState().camera !== "on"),
  toggleScreenShare: () => getMediaAdapter().setScreenShare(useMediaStore.getState().screen !== "on"),
};
