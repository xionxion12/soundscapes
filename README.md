# Soundscapes

A small mobile web app for **falling asleep to nature recordings**. Five hand-picked, high-quality
[xeno-canto](https://xeno-canto.org) soundscapes, each prepared as a seamless loop that plays until you
stop it or an optional sleep timer runs out and fades the sound away.

Built for an iPhone 14 Pro used with **AirPlay** (works as a Home Screen app or in Safari), true-black
OLED styling, no frameworks, no tracking, no network needed after the first play.

Live site: **https://xionxion12.github.io/soundscapes/**

## What's in it

| | |
|---|---|
| **Five soundscapes** | Scops owl at midnight (France), Italian tree crickets (Portugal), Amazon night (Brazil), rainforest canopy (Malaysia), wetland night (Ukraine). Chosen and explained in [`docs/curation.md`](docs/curation.md). |
| **Seamless loops** | ~7 min each, joined with an equal-power crossfade so they end exactly where they begin, loudness-matched to −24 LUFS so switching never jumps in volume. |
| **A scene driven by the recording** | The background reacts to the *actual* audio (a pre-computed 3-band envelope read at `audio.currentTime`): fireflies and ripples, bioluminescence, a moonlit star field. The orb breathes with the low band. |
| **Timer dial** | Drag the ring from ∞ to 3 h (finer steps below an hour, haptic ticks on iOS 18+), or tap a preset. The centre always says when it will end ("ends at 23:41"). |
| **Gentle ending** | The last minute fades to silence, on iOS too (see below). |
| **Sleep dim** | 15 s after your last touch the UI fades to ~5 % brightness and leaves only the dim arc and clock. Any tap brings it back. |
| **System integration** | AirPlay button + "Playing on AirPlay" badge, lock-screen / Control Center controls with artwork, next/previous between soundscapes. |
| **Offline** | A hand-written service worker caches the app and each recording on first play, and answers Safari's `Range` requests from the cache. |
| **Credits** | The ⓘ sheet shows the recording's sonogram, recordist, place, date, license and a link back to xeno-canto. |

## Design notes: what iOS Safari forces

- **One `<audio>` element does all playback.** iOS ignores `HTMLMediaElement.volume`, suspends Web Audio
  when the screen locks, and only offers the AirPlay picker on a media element. A single `<audio loop>`
  gives AirPlay, lock-screen playback and controls, and ignores the silent switch. Web Audio is never used.
  (All audio analysis for the visuals is done ahead of time, at build.)
- **Fading on iOS.** Because `volume` can't be set, 60 s before the timer ends the same element switches
  to `<id>-outro.m4a`: the first minute of the loop with a baked-in fade to silence. That costs one barely
  noticeable hiccup, then a perfectly smooth fade. Elsewhere `audio.volume` is ramped down. If the swap ever
  fails the sound is simply paused at the end time.
- **The timer is wall-clock based** (`endsAt`), checked on `timeupdate` (which keeps firing with the screen
  locked), on `visibilitychange` and once a second, so a throttled or suspended page can't overrun it.
- No wake lock: the phone auto-locks as usual and playback carries on.

## Develop

```bash
npm ci
npm run dev            # http://localhost:5173/soundscapes/
npm run typecheck
npm test               # unit tests (Vitest)
npm run test:e2e       # Playwright, iPhone 14 Pro viewport (builds + serves the site itself)
npm run build && npm run preview   # production build under /soundscapes/
```

End-to-end tests run on Chromium, which can't decode AAC, so audio requests are rerouted to a small Opus
fixture (`tests/e2e/fixtures`). Set `PW_CHROMIUM=/path/to/chrome` to use a specific browser. Screenshots of
each screen are written to `test-results/screens/`.

## Changing the recordings

The audio is **prepared once and committed** (`public/audio`); the site and CI never contact xeno-canto.

```bash
npm run audio:candidates -- med --top 12   # search xeno-canto, score recordings, write spectrograms
# look at .cache/candidates/report.md and the PNGs, then edit scripts/soundscapes.config.json
npm run audio:build                        # download, loop, normalise, encode, check, write the data file
npm run audio:build -- --only amazon-night # one soundscape
npm run art                                # re-render lock-screen artwork only
```

Needs `ffmpeg` and `ffprobe`. With `XC_API_KEY` set the scripts use the xeno-canto API v3; without it they
read the site's public search pages. `audio:build` refuses ND-licensed recordings (a loop is a derivative
work) and exits non-zero unless the loop length, the seam (no click), loudness (±1 LU of −24 LUFS) and true
peak checks all pass. Each soundscape in the config is `{ xcId, start, loop, crossfade, theme, name, subtitle }`.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes on every push to `main`. One-time setup:

1. Make sure the repository is **public** (or on a plan that supports Pages for private repos).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**

## Checking it on the iPhone

Automated tests run on Chromium, so these need a real device (Safari *and* installed to the Home Screen:
Share → Add to Home Screen):

- [ ] Playback carries on with the screen locked
- [ ] Lock-screen controls work: play/pause, next/previous change soundscape, artwork and title are right
- [ ] AirPlay works from the in-app button **and** from Control Center; the badge appears
- [ ] The timer fades out while the screen is locked and playback stops
- [ ] The silent switch doesn't mute it
- [ ] After one play, it works offline (airplane mode), including a reload
- [ ] Haptic ticks while dragging the dial (iOS 18+)
- [ ] The loop point is inaudible (a gapless `<audio loop>` isn't guaranteed on iOS: a faint dropout every
      7 minutes would be the thing to look for)

## Credits and licenses

All sound comes from [xeno-canto](https://xeno-canto.org). The recordings were **modified** (trimmed, looped,
high-passed at 40 Hz, loudness-normalised, re-encoded as AAC) and are shared under the same license as the
original. They are licensed for **non-commercial** use; please don't use these files commercially.
Per-recording details are also in [`public/audio/CREDITS.md`](public/audio/CREDITS.md) and in the app.

<!-- credits:start -->
| Soundscape | Recording | Recordist | Place | Date | License |
|---|---|---|---|---|---|
| Scops Owl at Midnight | [XC1008555](https://xeno-canto.org/1008555) | JACOB Hervé | Marans, Charente-Maritime, Nouvelle-Aquitaine, France | 2025-06-09 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Italian Tree Crickets | [XC854102](https://xeno-canto.org/854102) | Baudewijn Odé | ca. 1.5 km E of Abreiro, along the Rio Tua, Bragança, Portugal | 2015-07-11 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Amazon Night | [XC1177487](https://xeno-canto.org/1177487) | Fernanda Fernandex | Mâncio Lima, Acre, Brazil | 2026-08-16 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Rainforest Canopy | [XC574855](https://xeno-canto.org/574855) | Okamoto Keita Sin | Kumbang Hide, Taman Negara, Pahang, Malaysia | 2019-04-22 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Wetland Night | [XC832830](https://xeno-canto.org/832830) | Cedric Mroczko | Svalovychi, Lyubeshivs'kyi district, Volyn Oblast, Ukraine | 2023-05-16 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
<!-- credits:end -->

Fonts: [Fraunces](https://github.com/undercasetype/Fraunces) and [Inter](https://rsms.me/inter/) (SIL OFL),
self-hosted via Fontsource.
