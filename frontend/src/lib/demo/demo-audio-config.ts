/**
 * Demo ambient audio — local royalty-free assets in public/demo/.
 * Playback requires explicit user gesture (see DemoAudioController).
 */
export const DEMO_AUDIO_SOURCES = {
  mp3: "/demo/twin-demo-ambient.mp3",
  ogg: "/demo/twin-demo-ambient.ogg",
} as const;

export const DEMO_AUDIO_VOLUME_DEFAULT = 0.35;

export function demoAudioSourceList(): { src: string; type: string }[] {
  return [
    { src: DEMO_AUDIO_SOURCES.ogg, type: "audio/ogg" },
    { src: DEMO_AUDIO_SOURCES.mp3, type: "audio/mpeg" },
  ];
}
