declare module 'zzfx' {
  export function zzfx(...params: (number | undefined)[]): AudioBufferSourceNode | undefined;
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    play: (...params: (number | undefined)[]) => AudioBufferSourceNode | undefined;
    playSamples: (sampleChannels: number[][], volumeScale?: number, rate?: number, pan?: number, loop?: boolean) => AudioBufferSourceNode;
    buildSamples: (...params: (number | undefined)[]) => number[];
    getNote: (semitoneOffset?: number, rootNoteFrequency?: number) => number;
  };
}
