# Curation: how the five soundscapes were chosen

**Read this first:** the picks were made from xeno-canto metadata, numeric analysis and *spectrograms*
(viewed as images), not by listening. Please listen to each recording on its xeno-canto page and tell me
which to swap. Every runner-up below is a one-line change in `scripts/soundscapes.config.json`
followed by `npm run audio:build -- --only <id>`.

## Selection rules

- Quality A (B only when nothing better fit), **≥ 8 minutes**, ≥ 44.1 kHz.
- License **CC BY / BY-SA / BY-NC / BY-NC-SA**. ND is rejected: a loop is a derivative work.
- Night/season filter by recording time and month where the metadata has them.
- Calmness score (`scripts/find-candidates.mjs`) from per-second loudness spread, transient spikes,
  clipping and low-frequency rumble, used to find the calmest window; then a visual check of each
  spectrogram, and a band-balance check of the *built* loop (see "What I rejected").

## Chosen

| id | Recording | Where / when | Quality, license | Source window used |
|---|---|---|---|---|
| `scops-night` | [XC1008555](https://xeno-canto.org/1008555), Eurasian scops owl, JACOB Hervé | Marans, Charente-Maritime, France · 9 Jun 2025, 01:00 | A · CC BY-SA | 2:00 → 9:09 of 30:43 |
| `tree-crickets` | [XC854102](https://xeno-canto.org/854102), *Oecanthus pellucens* chorus, Baudewijn Odé | Abreiro, Bragança, Portugal · 11 Jul 2015, 22:58 | B · CC BY-SA | 2:30 → 9:39 of 34:14 |
| `amazon-night` | [XC1177487](https://xeno-canto.org/1177487), soundscape (map treefrog), Fernanda Fernandex | Mâncio Lima, Acre, Brazil · 16 Aug 2026, 01:35 | A · CC BY-NC-SA | 20:20 → 27:29 of 46:40 |
| `taman-negara` | [XC574855](https://xeno-canto.org/574855), soundscape, Okamoto Keita Sin | Kumbang Hide, Taman Negara, Malaysia · 22 Apr 2019, 06:38 | A · CC BY-NC-SA | 27:30 → 34:39 of 48:26 |
| `wetland-night` | [XC832830](https://xeno-canto.org/832830), soundscape, Cedric Mroczko | Svalovychi, Volyn, Ukraine · 16 May 2023, 21:35 | B · CC BY-NC-SA | 2:30 → 9:39 of 15:36 |

Why these:

- **Scops Owl at Midnight**: one owl calling every ~2 s through a quiet June night, steady for 19 minutes;
  clean low end. It is a lone owl rather than owl + insects (I found no A-quality ≥ 8 min recording with
  both, see below), and it is Atlantic France, not strictly "Mediterranean".
- **Italian Tree Crickets**: the classic warm southern-European night: a steady chorus of *Oecanthus
  pellucens*, 34 minutes, no events apart from two low bumps (around 15 and 23 min) that the chosen window
  avoids. Quality B.
- **Amazon Night**: a very dense, extremely steady (std 0.5 dB) wall of frogs and insects beside a stream.
  The most stationary recording I found.
- **Rainforest Canopy**: tagged "dawn chorus", but acoustically a diffuse insect wall with no prominent
  calls. The window is taken after the loud 9–11 kHz cicada burst earlier in the recording.
- **Wetland Night**: fire-bellied toads and tree frogs, a field cricket, and a bittern booming now and then
  in the distance (the stand-in for the "distant owl"). Dusk rather than deep night; quality B.

## Runners-up (all listed with the reason they lost)

| Recording | What it is | Why not |
|---|---|---|
| [XC1164498](https://xeno-canto.org/1164498) | Mediterranean tree frogs + reed crickets, salt marsh near Sevilla, A, CC BY-NC-SA, 13 min | **My favourite runner-up**; a clean, steady frog wall (it was built and passed every check). Dropped only because I wanted tree crickets and a different night. Swap-in candidate. |
| [XC660465](https://xeno-canto.org/660465) | European nightjar churring, Axat (Aude), 01:40, A, CC BY-NC-SA, 14 min | A very steady 2.4 kHz drone, strong; a few low thumps near 5–7 min and a mammal at the end. Could be tiring. |
| [XC1177486](https://xeno-canto.org/1177486) | Acre frog chorus, 00:50 | Near-twin of the Amazon pick. |
| [XC831144](https://xeno-canto.org/831144) / [XC962347](https://xeno-canto.org/962347) | Ukrainian evening chorus with songbirds / Iberian green frog pond with field crickets | Busier / similar to picks already in. |
| [XC670591](https://xeno-canto.org/670591) | Tawny owl + great green bush-cricket, Tarn, 00:30, B | The "distant owl + katydid" night I wanted, but it is high-passed at 300 Hz and almost all its energy is above 8 kHz: harsh for sleep. |
| [XC690255](https://xeno-canto.org/690255) | Marsh at midnight, Somme (field cricket, mole cricket, spotted crake) | Built, passed the automatic checks, then **rejected**: after loudness normalisation a steady sub-800 Hz rumble was as loud as the wanted sound (its source is very quiet, −46 LUFS). |
| [XC1008555's neighbours](https://xeno-canto.org/explore?query=sp%3A%22otus+scops%22) (XC489090, XC424115, XC383981) | Other scops owls | Short (< 10 min) and/or noisy (Etna eruption, town, nightingale). |

## What I rejected and why (the method matters)

- A recording can pass every "calm" metric yet be wrong for sleep: after normalising to −24 LUFS a quiet source
  has its noise floor lifted by 20 dB or more. So each built loop is profiled by band
  (`< 150 Hz`, `150–800`, `0.8–3 k`, `3–8 k`, `> 8 k`); a loop with a loud sub-150 Hz band (rumble) or most
  of its energy above 8 kHz (hiss) is rejected. The scops owl, tree-cricket, Amazon and wetland loops are within
  limits; the picks with the quietest sources (scops: +13 dB, tree crickets: +12 dB, wetland: +10 dB gain) are the
  ones to check by ear for hiss.
- Several xeno-canto "night" soundscapes are dawn choruses, or carry no time at all; the time filter lets
  unknown times through, so the spectrogram and remarks decide.
- Long (> 30 min) sources are only used for the build download; the finder analyses previews of ≤ 30 min
  (`--max-len`).

## Not found

- **Scops owl + Italian tree crickets in one recording**, ≥ 8 min, quality A: none. (The tree-cricket pick
  and the scops owl pick are separate soundscapes instead.)
- **A Borneo or Central-American night/dusk** soundscape of ≥ 8 min with an open license and a calm profile:
  the pool is small (mostly dawn choruses, ND licenses). Taman Negara (Peninsular Malaysia) stands in.
- **Temperate night with a distant owl**: see XC670591 above.
