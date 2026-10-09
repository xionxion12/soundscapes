# Curation: how the soundscapes were chosen

**Read this first:** the first eight picks were made from xeno-canto metadata, numeric analysis and *spectrograms*
(viewed as images), not by listening. From round 2 on, candidates are auditioned by ear first (2-minute previews, see
"Round 2" below) and only the keeps are built. Every runner-up below is a one-line change in `scripts/soundscapes.config.json`
followed by `npm run audio:build -- --only <id>`.

## Selection rules

- Quality A (B only when nothing better fit), **≥ 8 minutes**, ≥ 44.1 kHz.
- License **CC BY / BY-SA / BY-NC / BY-NC-SA**. ND is rejected: a loop is a derivative work.
- Night/season filter by recording time and month where the metadata has them.
- **No Australian Acoustic Observatory (A2O).** Its recordings are mono at 22.05 kHz (nothing above 11 kHz); all five
  A2O candidates were rejected by ear in round 2. Prefer **true stereo** (measured, not read from the file header).
- Calmness score (`scripts/find-candidates.mjs`) from per-second loudness spread, transient spikes,
  clipping and low-frequency rumble, used to find the calmest window; then a visual check of each
  spectrogram, and a band-balance check of the *built* loop (see "What I rejected").

## Chosen

| id | Recording | Where / when | Quality, license | Source window used |
|---|---|---|---|---|
| `scops-night` | [XC1008555](https://xeno-canto.org/1008555), Eurasian scops owl, JACOB Hervé | Marans, Charente-Maritime, France · 9 Jun 2025, 01:00 | A · CC BY-SA | 2:00 → 9:09 of 30:43 |
| `tree-crickets` | [XC854102](https://xeno-canto.org/854102), *Oecanthus pellucens* chorus, Baudewijn Odé | Abreiro, Bragança, Portugal · 11 Jul 2015, 22:58 | B · CC BY-SA | 2:30 → 9:39 of 34:14 |
| `taman-negara` | [XC574855](https://xeno-canto.org/574855), soundscape, Okamoto Keita Sin | Kumbang Hide, Taman Negara, Malaysia · 22 Apr 2019, 06:38 | A · CC BY-NC-SA | 27:30 → 34:39 of 48:26 |
| `rain-on-leaves` | [XC732936](https://xeno-canto.org/732936), rainy soundscape, Cedric Mroczko | Darkesh, North Khorasan, Iran (broadleaf forest, 1600 m) · 30 Apr 2022, 13:00 | B · CC BY-NC-SA | 33:00 → 40:09 of 61:02 |
| `frog-pond` | [XC990325](https://xeno-canto.org/990325), Iberian green frog chorus, Esperanza Poveda | Lagoon by the José Antonio Valverde visitor centre, Doñana marshes (Aznalcázar, Sevilla), Spain · 12 May 2018 | A · CC BY-NC-SA | 13:10 → 20:19 of 20:50 |
| `pyrenean-drizzle` | [XC996011](https://xeno-canto.org/996011), rainy soundscape, Cedric Mroczko | Massif du Pibeste-Aoulhet reserve, Hautes-Pyrénées, France · 2 May 2025, 16:50 | B · CC BY-NC-SA | 26:40 → 33:49 of 87:37 |
| `tree-frog-pond` | [XC1089960](https://xeno-canto.org/1089960), Mediterranean tree frog chorus, Cedric Mroczko | Lavalette, Haute-Garonne, France · 21 Mar 2026, 20:00 | B · CC BY-NC-SA | 48:10 → 55:19 of 66:27 |
| `creek-owl` | [XC986286](https://xeno-canto.org/986286), dusk soundscape with a tawny owl, Harald Pfleger | Wilder Graben, Reichraming, Upper Austria · 4 Apr 2025, 20:30 | B · CC BY-NC-SA | 7:15 → 14:24 of 19:47 |
| `stream-at-sunset` | [XC540233](https://xeno-canto.org/540233), sunset soundscape by a stream, Cedric Mroczko | By a chapel, Cordes-sur-Ciel, Tarn, France · 31 Mar 2020, 20:30 | B · CC BY-NC-SA | 23:25 → 30:34 of 34:40 |
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
- **Rain on Leaves**: steady spring rain falling through a broadleaf forest at the eastern end of the Hyrcanian forests, with a
  few distant birds (blue tit, chaffinch, mistle thrush) under it. Of all the rain recordings I measured it is the most
  rain-led (spectral flatness ~0.5: broadband patter rather than tonal birdsong) and among the steadiest (level SD 2.3 dB,
  LRA 7 LU), with the fewest close drop hits on the microphone. Nothing below ~300 Hz (the recordist high-passed it) and not
  hiss-heavy. The source is quiet (−35 LUFS), so the peaks are limited a little first (`prelimit: -14`, about 5 dB), which
  keeps the patter crisp. Quality B. **Listen to this one first.**
- **Frog Pond**: a dense, even chorus of Iberian green frogs on a lagoon in the Doñana marshes. Chosen for being *smooth*:
  in its calmest 7 minutes the loudest 1 % of moments are only 4.5 dB above the typical level (LRA 2.3 LU), with no single
  frog close to the microphone. The source is already louder than the target, so no noise floor is lifted. The window
  starts at 13:10 because a start at 13:00 failed the seam check (a sample jump at the join).
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
No Australian rain loop is in the app; Rain on Leaves (Iran, below) replaced it. The Australian Acoustic Observatory is reachable now and was searched (next section); Freesound is still blocked here.

## Australian rain from A2O: search result

The [Australian Acoustic Observatory](https://acousticobservatory.org) (A2O) API is open and the recordings are CC BY 4.0.
Clips are capped at 300 s per request (two overlapping clips splice sample-exactly), and the original files need a login.
Every recording is mono at 22.05 kHz, so there is nothing above 11 kHz.

Method: the `rain` tag (2,783 clips in 2,319 recordings at 36 sites). I probed 585 one-minute windows around tags at the
forest sites (Little Llangothlin/Warra, SEQP Samford, Five Rivers, Reedy Creek), then pulled 9.5 minutes around the best
15 and scored them for flatness, steadiness, drop bursts and kurtosis.

Finding: the steady "rain" spans are Gaussian (kurtosis ≈ 3) at −55 to −58 dBFS. That is mostly the recorder's own hiss,
which normalising would lift by about 30 dB. The spans with real rain have drops hitting the recorder housing (peaks to
0 dBFS).

Two candidates were previewed and **rejected by ear**: recording 17817 (Little Llangothlin/Warra, 17 Mar 2020) and
recording 1869 (SEQP Samford, 17 Jul 2019).

Still open: an Australian rain loop. Untagged wet-forest A2O sites (Victoria, Tasmania) were not searched.

## Rain on leaves, worldwide: search result

I collected every xeno-canto recording of 8 minutes or more whose remarks mention rain (rain, drizzle, lluvia, chuva,
Regen, pluie, pioggia: 564 recordings; 122 of them quality A/B with a license that allows a loop), downloaded the 15
that sounded rain-led from their remarks, and scored each 7-minute window by spectral flatness (rain is broadband, birdsong
tonal), the steadiness of its level, and how many 10 ms bursts and how high the peaks rose over the bed (drops hitting the mic).

| Recording | What it is | Verdict |
|---|---|---|
| [XC732936](https://xeno-canto.org/732936) | Rainy soundscape, Darkesh, Iran, 61 min, B | **Picked.** |
| [XC831375](https://xeno-canto.org/831375) | Rainy dawn in a Carpathian beech forest, Zakarpattia, Ukraine, 99 min, B | **Runner-up** (window ~85:00): heavier, very steady rain, but water hits the mics hard (peaks 42 dB over the bed, ~190 bursts per 7 min), a repeating song-thrush phrase, and a loud downpour swell near 77 min. |
| [XC237622](https://xeno-canto.org/237622) / [XC237623](https://xeno-canto.org/237623) | Montane forest after a night of rain, Casanare, Colombia, A | 10 min each and mono 128 kbps. |
| [XC657344](https://xeno-canto.org/657344) | Light rain, Aude, France, 58 min, B | The rain comes and goes; most of it is birds. |
| [XC728566](https://xeno-canto.org/728566), [XC727557](https://xeno-canto.org/727557) | Rainy morning / rainy soundscape, Iran | Less rain-led than the pick; footsteps at the end of XC727557. |
| [XC724433](https://xeno-canto.org/724433) | Dawn chorus in the rain, Shanghai, 54 min | 56 kbps, birds over a city. |
| [XC828083](https://xeno-canto.org/828083), [XC829500](https://xeno-canto.org/829500), [XC829534](https://xeno-canto.org/829534) | Rainy dawn choruses, Volyn, Ukraine | Birds dominate after the first few minutes. |
| [XC524224](https://xeno-canto.org/524224) | Tawny owls on a rainy night, Poland, A | The rain is barely audible (−43 LUFS). |

## Frog pond: search result

I collected every frog recording of 8 minutes or more (`grp:frogs`), plus every recording whose remarks mention frogs,
toads or a pond in six languages (686 recordings), and kept 18 quality A/B choruses with a loop license. Each was scored
for smoothness: how far the loudest 1 % of 100 ms moments rise above the typical level in its calmest 7 minutes, the
level drift, and the highest peak.

| Recording | What it is | Verdict |
|---|---|---|
| [XC990325](https://xeno-canto.org/990325) | Iberian green frogs, lagoon, Doñana, 21 min, A | **Picked.** Loudest 1 % only 4.5 dB over the bed. |
| [XC1025871](https://xeno-canto.org/1025871) | Common tree frogs, gravel pit, Lake Constance, Germany, 60 min, B | The smoothest of all (2.6 dB), but mono, a narrow 2.4 kHz drone, and as much rumble below 150 Hz as above. |
| [XC1090892](https://xeno-canto.org/1090892) | Iberian green frogs, a stream near Córdoba, with a scops owl, 37 min, B | Smooth (7 dB) but quiet (−37 LUFS): the noise floor would be lifted 13 dB. |
| [XC962343](https://xeno-canto.org/962343) and its neighbours | Iberian green frogs, a small lagoon in oak and pine woods, Salamanca, A | Single frogs close to the mic: 9–13 dB spikes. |
| [XC1164498](https://xeno-canto.org/1164498) | Mediterranean tree frogs + reed crickets, Sevilla (the old runner-up) | 14 dB spikes. |
| [XC841134](https://xeno-canto.org/841134), [XC840919](https://xeno-canto.org/840919), [XC965617](https://xeno-canto.org/965617), [XC883890](https://xeno-canto.org/883890) | European and eastern tree frog choruses | Loud, pulsing calls close to the mic: 20–28 dB spikes. |
| [XC883651](https://xeno-canto.org/883651), [XC886821](https://xeno-canto.org/886821) | Bronze (green) frog choruses, New York | Booming single males: 18–31 dB spikes. |

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
Observatory](https://acousticobservatory.org) (CC BY 4.0) is the likely source.
Its API is reachable now (see "Australian rain from A2O" above), but only rain was searched, not quiet nights.
Each soundscape has its own scene: the Dandenongs lyrebird has tree ferns in shafts of light, Blue Mountains Dawn the southern sky over eucalypts, and Queensland Dawn a sunrise behind hoop pines.

## Other Australian recordings I looked at

All of these are on xeno-canto, which has only about 80 recordings of 8 minutes or more from Australia.

| Recording | Why not |
|---|---|
| [XC568248](https://xeno-canto.org/568248), a still winter morning, Faulconbridge, 36 min, A, CC BY-SA | Built and **rejected**: the source is −53 LUFS, so after normalising the 50/100 Hz hum and room noise are as loud as the birds (the "quiet source" trap below). |
| [XC441594](https://xeno-canto.org/441594), Faulconbridge dawn, 23 min, A | Almost silent between a few single calls: the noise floor would be lifted a lot. |
| [XC446864](https://xeno-canto.org/446864), Nankeen night herons at 23:30, Faulconbridge, 8 min, A | The only Australian *night* recording ≥ 8 min with a good license, but the file is 8 kHz (< 44.1 kHz). |
| [XC443120](https://xeno-canto.org/443120), Faulconbridge afternoon, 47 min | Long quiet stretches broken by loud events. |
| Kakadu dawns ([XC482453](https://xeno-canto.org/482453), [XC482572](https://xeno-canto.org/482572), [XC483007](https://xeno-canto.org/483007)) | Strong low-frequency rumble (≥ 86 % of the energy). |

## Round 2 (October 2026): auditioned by ear

Seventeen candidates were picked to match what had stayed in the app (steady beds of rain, insects, frogs and one owl,
plus Victoria and the two open gaps: an Australian rain loop and a quiet Victorian night). Each was auditioned as a
2-minute preview from the middle of its loop window, processed the way the loops are (`npm run audio:previews`, from
[`scripts/shortlist.json`](../scripts/shortlist.json), which also records the verdicts), with a stereo/mono flag measured
from the left/right correlation.

**Kept and built:** Pyrenean Drizzle (`pyrenean-drizzle`), Tree Frog Pond (`tree-frog-pond`), Creek and Tawny Owl
(`creek-owl`) and Stream at Sunset (`stream-at-sunset`), each with its own scene (misty ridges in the drizzle, a dusk spruce
valley with an owl, a chapel at sunset, a twilight marsh with a heron).

**Passed by ear:**

| Recording | What it is |
|---|---|
| A2O 974630, 975930 | Wombat State Forest, Victoria: a summer night wall of sound, and probable rain |
| A2O 1214218 | Marshmead, Croajingolong, Victoria: a quiet spring night (+13 dB lift) |
| A2O 492247, 488123 | Daintree nights, layered insect choruses |
| [XC831375](https://xeno-canto.org/831375) | Carpathian rain (last round's runner-up) |
| [XC324425](https://xeno-canto.org/324425) | Thunder in a Bavarian beech wood |
| [XC770950](https://xeno-canto.org/770950) | Pyrenean mountain stream, a low roar (+16 dB) |
| [XC963674](https://xeno-canto.org/963674) | Pine-forest torrent, Salamanca (bright hiss; partly out of phase) |
| [XC1047876](https://xeno-canto.org/1047876) | Calm Arctic sea, Troms |
| [XC883905](https://xeno-canto.org/883905) | Marsh frogs and tree frogs, Tarn |
| [XC1164498](https://xeno-canto.org/1164498) | Tree frogs and reed crickets, Sevilla (last round's favourite runner-up; partly out of phase) |
| [XC660465](https://xeno-canto.org/660465) | Nightjar churring, Aude (last round's runner-up) |

What the verdicts say about taste: every A2O recording was passed (mono, 22.05 kHz, so A2O is no longer used), and so was
everything harsh, very bright or dramatic (thunder, torrent hiss, a single-pitch nightjar). All four keeps are gentle,
stereo, European (three of them French) and evening or rain. A heavily lifted quiet source was fine (Stream at Sunset is
raised 27 dB), so a low source level alone is no reason to reject.

How the round was found: the remarks of 4,659 xeno-canto recordings (rain, streams, sea, frogs, crickets, owls, nightjars,
Australia, New Zealand) were read, 26 were downloaded and their calmest 7-minute window measured, and 1,017 one-minute
night samples from A2O recorders in Wombat State Forest, Marshmead (Croajingolong) and the Daintree were scored for
loudness and band balance.

Measured and left out before the audition: close-calling tawny owls ([XC712686](https://xeno-canto.org/712686), [XC1098991](https://xeno-canto.org/1098991): 55–75 sharp hits a minute), owls in the rain in Bavaria ([XC324428](https://xeno-canto.org/324428), [XC324439](https://xeno-canto.org/324439): 36–39 a minute), a Swedish meltwater stream ([XC782764](https://xeno-canto.org/782764): 71 % of the energy below 150 Hz), a Swedish thunderstorm ([XC814121](https://xeno-canto.org/814121): clips), a Brittany nightjar ([XC1000193](https://xeno-canto.org/1000193): rumble), a second Blue Mountains lyrebird ([XC1163855](https://xeno-canto.org/1163855): busier than the Dandenongs one), a Malaysian katydid night ([XC958773](https://xeno-canto.org/958773): its song is ultrasonic) and the Acre frog twin of the dropped Amazon Night.

## Runners-up (all listed with the reason they lost)

| Recording | What it is | Why not |
|---|---|---|
| [XC1164498](https://xeno-canto.org/1164498) | Mediterranean tree frogs + reed crickets, salt marsh near Sevilla, A, CC BY-NC-SA, 13 min | **My favourite runner-up**; a clean, steady frog wall (it was built and passed every check). Dropped only because I wanted tree crickets and a different night. **Passed by ear in round 2.** |
| [XC660465](https://xeno-canto.org/660465) | European nightjar churring, Axat (Aude), 01:40, A, CC BY-NC-SA, 14 min | A very steady 2.4 kHz drone, strong; a few low thumps near 5–7 min and a mammal at the end. Could be tiring. **Passed by ear in round 2.** |
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
