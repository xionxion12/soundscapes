# Curation: how the soundscapes were chosen

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
| `taman-negara` | [XC574855](https://xeno-canto.org/574855), soundscape, Okamoto Keita Sin | Kumbang Hide, Taman Negara, Malaysia · 22 Apr 2019, 06:38 | A · CC BY-NC-SA | 27:30 → 34:39 of 48:26 |
| `dandenong-lyrebird` | [XC1173949](https://xeno-canto.org/1173949), superb lyrebird, Romuald Mikusek | Dandenong Ranges NP (Ferntree Gully area, near Tremont), **Victoria** · 22 Jan 2024, 07:30 | A · CC BY-NC-SA | 0:55 → 8:04 of 9:05 |
| `blue-mountains-dawn` | [XC442478](https://xeno-canto.org/442478), dawn chorus, James Ray | Faulconbridge, Blue Mountains, New South Wales · 8 Oct 2018, 07:21 | A · CC BY-NC-SA | 6:00 → 13:09 of 17:54 |
| `queensland-dawn` | [XC505753](https://xeno-canto.org/505753), sunrise soundscape, Tom Tarrant | Dayboro, Moreton Bay, Queensland · 3 Nov 2019, 07:00 | A · CC BY-NC-SA | 9:40 → 16:49 of 33:02 |

Why these:

- **Scops Owl at Midnight**: one owl calling every ~2 s through a quiet June night, steady for 19 minutes;
  clean low end. It is a lone owl rather than owl + insects (I found no A-quality ≥ 8 min recording with
  both, see below), and it is an Atlantic marsh in France, so it gets the moonlit *night* scene rather than the
  Mediterranean one.
- **Italian Tree Crickets**: the classic warm southern-European night: a steady chorus of *Oecanthus
  pellucens*, 34 minutes, no events apart from two low bumps (around 15 and 23 min) that the chosen window
  avoids. Quality B.
  *Why Portugal?* Not a mistake: *Oecanthus pellucens* is called the **Italian tree cricket** in English
  (Scopoli described it from Italy in 1763), but it lives all over southern Europe, Portugal included. XC854102
  really is from the Rio Tua valley near Bragança. The app now shows "Italian tree cricket" with the scientific
  name in italics (the build had stored the Latin name as the common name).
- **Lyrebird in the Dandenongs** (Victoria, about 40 km east of Melbourne CBD, well inside an hour's drive): the
  only recording in the Melbourne area that is long enough (9 min), quality A, ≥ 44.1 kHz and licensed for a loop. It is
  **the liveliest loop in the app**: a male superb lyrebird running through its mimicry of other birds almost without a
  pause, so it is a dense, bright forest wall (mostly 1–6 kHz), not a lull. It has no rumble or hiss (nothing below 800 Hz
  to lift). **Listen to this one first** and tell me if it is too busy for sleep.
- **Blue Mountains Dawn**: a rich but continuous dawn chorus (eastern spinebill, king parrots, wonga pigeon, a lyrebird in the
  distance). The source carries a strong 50/100 Hz hum (and sets off the limiter), so the loop is high-passed at 150 Hz three
  times over (`highpass: 150`, `highpassPasses: 3`; sub-150 Hz ends up 10 dB under the other bands) and the peaks are limited
  first (`pregain: 12`, `prelimit: -10`), otherwise it ends up 10 LU too quiet. The recordist trimmed the source slightly.
- **Queensland Dawn**: a soft subtropical sunrise chorus, stereo, a calm window with few transients. Peaks are limited first
  (`pregain: 12`, `prelimit: -20`) or the loop would be 6 LU too quiet.
- **Rainforest Canopy**: tagged "dawn chorus", but acoustically a diffuse insect wall with no prominent
  calls. The window is taken after the loud 9–11 kHz cicada burst earlier in the recording.

## Removed at review

| id | Recording | Why removed |
|---|---|---|
| `amazon-night` | [XC1177487](https://xeno-canto.org/1177487), Acre frog and insect chorus, Fernanda Fernandex, CC BY-NC-SA | Dropped from the line-up to make room for the Australian recordings (below). |
| `wetland-night` | [XC832830](https://xeno-canto.org/832830), wetland soundscape, Volyn, Ukraine, Cedric Mroczko, CC BY-NC-SA | Dropped from the line-up. |

Their config entries are in git history if you want them back (the audio is rebuilt from xeno-canto by `npm run audio:build`).

## Rain from Australia: search result

I paged through all 818 Australian xeno-canto soundscapes plus every Australian recording that mentions rain, and
filtered on the whole words rain / raining / rainfall / downpour / drizzle / shower / thunder / storm in the remarks. Of
the ~1,000 recordings that came up, one is long enough (≥ 8 min), mostly rain, and licensed for a loop:
XC442992, which was used as "Blue Mountains Rain" and then **removed** because the quality was too low (37 kbps mono
MP3 recorded through a bedroom window). The others are single bird recordings "in the rain" of under a minute (e.g. Peter Boesman's,
which are also ND), or soundscapes where rain starts partway through (XC443114 at 16:10, XC442755 at 33:50).
No rain loop is in the app now. A better rain recording is likely to exist on the Australian Acoustic Observatory or Freesound (blocked here, see below).

## Victoria, near Melbourne: search result

The first search missed most of Victoria because the xeno-canto results parser (`scripts/lib/xc.mjs`) only read rows
of the form `<tr >` and skipped `<tr class='new-species'>`, i.e. the *first recording of every species* on each results
page. With the parser fixed, `box:-38.6,144.0,-37.0,145.9` (Melbourne, the Dandenongs, Yarra Valley, Mornington Peninsula,
Western Port) holds only 11 recordings of 2 minutes or more, and none a night soundscape:

| Recording | What it is | Verdict |
|---|---|---|
| [XC1173949](https://xeno-canto.org/1173949) | Superb lyrebird, Dandenong Ranges, 9:05, A, CC BY-NC-SA | **Picked.** Busy (see above). |
| [XC1062797](https://xeno-canto.org/1062797) | Soundscape, French Island (Western Port), 9:09, A, CC BY-NC-SA | Brush bronzewing's call over scrub by the sea, many transients (133 spikes/min), and a ferry from the mainland. |
| [XC974554](https://xeno-canto.org/974554), [XC1019696](https://xeno-canto.org/1019696) | Superb lyrebird, Kallista / Sherbrooke, 6:12 / 4:28 | Shorter than the 7-minute loop. |
| [XC1074788](https://xeno-canto.org/1074788) | Superb lyrebird, Sherbrooke, 7:03, A | ND (no loops). |
| [XC641433](https://xeno-canto.org/641433) / [XC641430](https://xeno-canto.org/641430) | Black Range dawn chorus (quality C) / southern boobook at 03:00, Murrindindi | About 1½ hours from Melbourne; the boobook is 24 kHz mono. |

Still open: a quiet Victorian *night* (boobook, frogs, crickets). The [Australian Acoustic
Observatory](https://acousticobservatory.org) (CC BY 4.0) is the likely source, but `api.acousticobservatory.org` and
`data.acousticobservatory.org` are **blocked by the build environment's network policy** (only the main site answers).
The `bush` scene is used by the Victorian and Blue Mountains loops for now.

## Other Australian recordings I looked at

All of these are on xeno-canto, which has only about 80 recordings of 8 minutes or more from Australia.

| Recording | Why not |
|---|---|
| [XC568248](https://xeno-canto.org/568248), a still winter morning, Faulconbridge, 36 min, A, CC BY-SA | Built and **rejected**: the source is −53 LUFS, so after normalising the 50/100 Hz hum and room noise are as loud as the birds (the "quiet source" trap below). |
| [XC441594](https://xeno-canto.org/441594), Faulconbridge dawn, 23 min, A | Almost silent between a few single calls: the noise floor would be lifted a lot. |
| [XC446864](https://xeno-canto.org/446864), Nankeen night herons at 23:30, Faulconbridge, 8 min, A | The only Australian *night* recording ≥ 8 min with a good license, but the file is 8 kHz (< 44.1 kHz). |
| [XC443120](https://xeno-canto.org/443120), Faulconbridge afternoon, 47 min | Long quiet stretches broken by loud events. |
| Kakadu dawns ([XC482453](https://xeno-canto.org/482453), [XC482572](https://xeno-canto.org/482572), [XC483007](https://xeno-canto.org/483007)) | Strong low-frequency rumble (≥ 86 % of the energy). |

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
  of its energy above 8 kHz (hiss) is rejected. The scops owl and tree-cricket loops are within
  limits; the picks with the quietest sources (scops: +13 dB, tree crickets: +12 dB gain) are the
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
