import raw from './soundscapes.json';
import type { EnvelopeData } from './envelope';

export type ThemeId = 'mediterranean' | 'rainforest' | 'night' | 'bush' | 'rain' | 'pond' | 'ferns' | 'sunrise';

export interface Soundscape {
  id: string;
  name: string;
  subtitle: string;
  theme: ThemeId;
  /** Paths relative to the site base. */
  file: string;
  outro: string;
  /** 5 s clips for the start/pause fades where `audio.volume` does not work (iOS). */
  fadeIn: string;
  fadeOut: string;
  sonogram: string;
  art: string;
  /** Loop length in seconds. */
  duration: number;
  envelope: EnvelopeData;
  xc: {
    id: number;
    url: string;
    recordist: string;
    species: string;
    scientific: string | null;
    also: string[];
    country: string;
    location: string;
    lat: number | null;
    lon: number | null;
    date: string | null;
    time: string | null;
    licenseName: string;
    licenseUrl: string;
    remarks: string;
  };
  processing: string;
}

export const soundscapes = (raw as { items: Soundscape[] }).items;

/** Absolute URL of a bundled asset, honouring Vite's `base`. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
