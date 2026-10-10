# Soundscapes

A small mobile web app for **falling asleep to nature recordings**. Thirteen hand-picked
[xeno-canto](https://xeno-canto.org) soundscapes, each prepared as a seamless loop that plays until you
stop it or an optional sleep timer runs out and fades the sound away.

Built for an iPhone 14 Pro used with **AirPlay** (works as a Home Screen app or in Safari), true-black
OLED styling, no frameworks, no tracking, no network needed after the first play.

Live site: **https://xionxion12.github.io/soundscapes/**

## What's in it

| | |
|---|---|
| **Thirteen soundscapes** | Scops owl at midnight (France), Italian tree crickets (Portugal), a Cretan tree cricket (Akrotiri, Crete), rainforest canopy (Malaysia), rain on leaves (a broadleaf forest in north-east Iran), a Pyrenean drizzle (Hautes-Pyrénées), a frog pond (Doñana, Spain), a tree frog pond (near Toulouse), a creek at dusk with a tawny owl (Upper Austria), a stream at sunset (Cordes-sur-Ciel, Tarn), and three from Australia: a Blue Mountains dawn chorus, a lyrebird in the Dandenong Ranges (Victoria, about 40 km from Melbourne) and a Queensland sunrise. [`docs/curation.md`](docs/curation.md) explains the choices. |
| **Seamless loops** | ~7 min each, joined with an equal-power crossfade so they end exactly where they begin, loudness-matched to −24 LUFS so switching never jumps in volume. |
| **A scene driven by the recording** | The background reacts to the *actual* audio (a pre-computed 3-band envelope read at `audio.currentTime`): each soundscape has its own: fireflies and ripples, bioluminescence, a moonlit star field (the owl's calls swell a halo round the moon), rain through dripping broadleaf boughs (heavier with the hiss of the rain), a moonlit pond whose calls ripple out from the lily pads, shafts of light through tree ferns that swell with the lyrebird, a southern sky over eucalypts, a subtropical sunrise behind hoop pines with birds crossing on the calls, misty Pyrenean ridges in a drizzle that thickens with the rain's hiss, a dusk spruce valley whose creek glints run faster with the water and whose owl opens its eyes on a call, a hilltop chapel at sunset whose window warms on a call, the moon over the Aegean from a Cretan headland, its path on the sea glittering with the cricket's trill, and a twilight marsh where the frog chorus lights up along the waterline. The orb breathes with the low band. |
| **Sleep timer** | Three choices: **∞**, **45 min** or **9 h**. The centre always says when it will end ("ends at 23:41"). |
| **Soft starts and stops** | Every start fades in over 4 s on a gentle S-curve and every pause fades out over 5 s (the screen says "paused" at once; tapping play mid-fade turns it round). A timer's last minute fades to silence. All of it works on iOS too (see below). |
| **Sleep dim** | 15 s after your last touch the UI fades to ~5 % brightness and leaves only the clock. Any tap brings it back. |
| **System integration** | AirPlay button + "Playing on AirPlay" badge, lock-screen / Control Center controls with artwork, next/previous between soundscapes. |
| **Offline** | A hand-written service worker caches the app and each recording on first play, and answers Safari's `Range` requests from the cache. |
| **Credits** | The ⓘ sheet shows the recording's sonogram, recordist, place, date, license and a link back to xeno-canto. |

## Design notes: what iOS Safari forces

- **One `<audio>` element does all playback.** iOS ignores `HTMLMediaElement.volume`, suspends Web Audio
  when the screen locks, and only offers the AirPlay picker on a media element. A single `<audio loop>`
  gives AirPlay, lock-screen playback and controls, and ignores the silent switch. Web Audio is never used.
  (All audio analysis for the visuals is done ahead of time, at build.)
- **Start and pause fades on iOS.** The same trick, in miniature: a start plays `<id>-fadein.m4a` (the loop's first 4 s,
  faded in) and then continues the loop at 4 s; a pause plays `<id>-fadeout.m4a` (the first 5 s, faded out) in place of
  the loop. On iOS a play therefore always begins at the loop's start. Elsewhere it is a volume ramp and resumes where it
  stopped. If a clip can't play, the loop starts or stops without a fade. Pausing from the lock screen can't fade.
- **Timer fade on iOS.** Because `volume` can't be set, 60 s before the timer ends the same element switches
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
npm run audio:build -- --only tree-crickets # one soundscape
npm run art                                # re-render lock-screen artwork only
npm run audio:fades                        # re-render the fade clips from the committed loops (no download)
npm run audio:previews                     # 2-minute listening previews of the candidates in scripts/shortlist.json
```

Needs `ffmpeg` and `ffprobe`. With `XC_API_KEY` set the scripts use the xeno-canto API v3; without it they
read the site's public search pages. `audio:build` refuses ND-licensed recordings (a loop is a derivative
work) and exits non-zero unless the loop length, the seam (no click), loudness (±1 LU of −24 LUFS) and true
peak checks all pass. Each soundscape in the config is `{ xcId, start, loop, crossfade, theme, name, subtitle }`, plus optional `species`,
`scientific` and `place` overrides, and, for a quiet source with loud transients, `prelimit` (a dBFS peak limiter run before loudness
normalisation; the limiter's lowest ceiling is −24 dBFS, so `pregain` dB lifts the source first) and, for a source with mains hum or rumble,
`highpass` (Hz, default 40) with `highpassPasses` (how many times the filter is applied, default 1).

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
- [ ] The three timer chips look right and tap cleanly
- [ ] The loop point is inaudible (a gapless `<audio loop>` isn't guaranteed on iOS: a faint dropout every
      7 minutes would be the thing to look for)

## Licenses

- **Code**: © the author, all rights reserved. No license is granted for the source code.
- **Audio**: every sound is a [xeno-canto](https://xeno-canto.org) recording, used under the Creative Commons
  license its recordist chose (table below). The recordings were **modified** (trimmed, looped, high-passed (at 40 Hz, or higher for
  a source with hum), loudness-normalised, re-encoded as AAC) and the results are **shared under the same license** as the
  original (ShareAlike). Where the license says **NonCommercial** the sound may not be used commercially: this
  app is free and will stay free, with no ads. Recordist, license and a link back to xeno-canto are in the ⓘ sheet,
  on the lock screen and in [`public/audio/CREDITS.md`](public/audio/CREDITS.md).
- **Fonts**: [Inter](https://rsms.me/inter/) and [EB Garamond](https://github.com/octaviopardo/EBGaramond12), both
  under the [SIL Open Font License 1.1](https://openfontlicense.org), self-hosted via Fontsource. Both are listed on
  [Open Foundry](https://open-foundry.com). The license texts ship with the app:
  [`public/licenses/OFL-Inter.txt`](public/licenses/OFL-Inter.txt) and
  [`public/licenses/OFL-EB-Garamond.txt`](public/licenses/OFL-EB-Garamond.txt).
- **Artwork, icons and sonograms** are generated by this repository's scripts (`npm run art`, `npm run icons`,
  `npm run audio:build`). No third-party images are used.

<!-- credits:start -->
| Soundscape | Recording | Recordist | Place | Date | License |
|---|---|---|---|---|---|
| Scops Owl at Midnight | [XC1008555](https://xeno-canto.org/1008555) | JACOB Hervé | Marans, Charente-Maritime, Nouvelle-Aquitaine, France | 2025-06-09 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Italian Tree Crickets | [XC854102](https://xeno-canto.org/854102) | Baudewijn Odé | ca. 1.5 km E of Abreiro, along the Rio Tua, Bragança, Portugal | 2015-07-11 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Cretan Tree Cricket | [XC854211](https://xeno-canto.org/854211) | Baudewijn Odé | Stavros, Akrotiri peninsula, Chania, Crete, Greece | 2019-06-24 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Rainforest Canopy | [XC574855](https://xeno-canto.org/574855) | Okamoto Keita Sin | Kumbang Hide, Taman Negara, Pahang, Malaysia | 2019-04-22 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Rain on Leaves | [XC732936](https://xeno-canto.org/732936) | Cedric Mroczko | Darkesh, Maneh va Samalqan, North Khorasan, Iran | 2022-04-30 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Pyrenean Drizzle | [XC996011](https://xeno-canto.org/996011) | Cedric Mroczko | Massif du Pibeste-Aoulhet nature reserve, Hautes-Pyrénées, France | 2025-05-02 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Frog Pond | [XC990325](https://xeno-canto.org/990325) | Esperanza Poveda | Lagoon by the José Antonio Valverde visitor centre, Aznalcázar, Sevilla, Spain | 2018-05-12 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Tree Frog Pond | [XC1089960](https://xeno-canto.org/1089960) | Cedric Mroczko | Lavalette, Haute-Garonne, France | 2026-03-21 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Creek and Tawny Owl | [XC986286](https://xeno-canto.org/986286) | Harald Pfleger | Wilder Graben, Reichraming, Upper Austria, Austria | 2025-04-04 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Stream at Sunset | [XC540233](https://xeno-canto.org/540233) | Cedric Mroczko | A small valley by a chapel, Cordes-sur-Ciel, Tarn, France | 2020-03-31 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Lyrebird in the Dandenongs | [XC1173949](https://xeno-canto.org/1173949) | Romuald Mikusek | Dandenong Ranges National Park (Ferntree Gully area, near Tremont), Victoria, Australia | 2024-01-22 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Blue Mountains Dawn | [XC442478](https://xeno-canto.org/442478) | James Ray | Faulconbridge, Blue Mountains, New South Wales, Australia | 2018-10-08 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| Queensland Dawn | [XC505753](https://xeno-canto.org/505753) | Tom Tarrant | Dayboro, Moreton Bay Region, Queensland, Australia | 2019-11-03 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
<!-- credits:end -->
