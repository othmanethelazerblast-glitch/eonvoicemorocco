# EP 1 — CapCut assembly guide (60 s, 9:16)

## 0. Setup
1. New project → **9:16**, 1080×1920, **30 fps**. Turn **Auto captions off**.
2. Import everything: `clips/` (1A…7B), `voice/` (your six recordings), `ep01.srt`, the SFX and music you pick below.
3. Create tracks, top to bottom: **Text/Overlays** · **Subtitles** · **Video** · **Voice** (one lane per character) · **SFX** · **Music**.

## 1. Video track — order, cuts, durations
Trim each clip from its start (cut the generation's lead-in) to the target length. Cuts are **hard cuts** unless noted.

| # | Clip | In (s) | Out (s) | Notes |
|---|---|---|---|---|
| 1 | 1A | 0.0 | 1.6 | gate shove, box in mud |
| 2 | 1B | 1.6 | 2.5 | Salma at the window. **Freeze the last 0.2 s** (2.3–2.5) for impact |
| 3 | 1C | 2.5 | 3.0 | **SMASH TO BLACK** (black clip). Text card goes here |
| 4 | 2A | 3.0 | 5.5 | bale slash; speed-ramp 100% → 40% as clothes burst |
| 5 | 2B | 5.5 | 10.0 | market; slow push |
| 6 | 3A | 10.0 | 14.5 | Yahya runs in |
| 7 | 3B | 14.5 | 17.5 | Hamid, not looking up |
| 8 | 3C | 17.5 | 19.0 | label macro; **freeze 18.0–18.7** |
| 9 | 3D | 19.0 | 20.0 | Yahya hangs the coat back |
| 10 | 4A | 20.0 | 24.0 | lady haggles |
| 11 | 4B | 24.0 | 28.5 | thumb on seam → Hamid's face |
| 12 | 4C | 28.5 | 31.5 | lady hesitates, leaves |
| 13 | 4D | 31.5 | 35.0 | Yahya's belly |
| 14 | 5A | 35.0 | 37.0 | Mi Zhor counts coins |
| 15 | 5B | 37.0 | 41.0 | Yahya, bread |
| 16 | 5C | 41.0 | 45.0 | Mi Zhor's proverb |
| 17 | 6A | 45.0 | 48.0 | knock, wallet |
| 18 | 6B | 48.0 | 52.0 | **FLASHBACK** (see grade) |
| 19 | 7A | 52.0 | 55.5 | walk, steps on card |
| 20 | 7B | 55.5 | 60.0 | Yahya over shoulder; **freeze 59.0–60.0**, then hard cut to black at 60.0 |

Too short? Use **Freeze** on the last frame. Too long? Trim the dead lead-in first, never the action.

## 2. Voice track
Drop each recording on its own lane and **split it into lines** at the pauses (`Ctrl/Cmd+B`). Slide each line to its start time:

| Line | Start (s) | Lane |
|---|---|---|
| 01 Salma | 1.6 | Salma |
| 02 Hamid VO | 3.8 | Hamid |
| 03 Yahya | 10.4 | Yahya |
| 04 Hamid | 15.6 | Hamid |
| 05 Hamid ("Guci.") | 18.0 | Hamid |
| 06 Lady | 20.6 | Lady |
| 07 Hamid | 24.0 | Hamid |
| 08 Yahya | 31.5 | Yahya |
| 09 Yahya | 37.0 | Yahya |
| 10 Mi Zhor | 41.5 | Mi Zhor |
| 11 Father | 48.0 | Father |
| 12 Yahya | 55.5 | Yahya |

- **Voice cleanup (all lanes):** Noise reduction on, Normalize, Voice enhance to taste.
- **Hamid VO (02):** slight low-pass + tiny reverb (it's inner voice).
- **Father (11):** same, plus soft **Echo** ("memory").
- **Salma (01):** put a **Hall reverb** on and an **end fade** so the scream dies into the black.

## 3. Overlays (Text/Overlays track)
1. **Title card — "3 ashhor qbel…"** · 2.5–3.4 s · white, bold, centered in the black frame. Use a **typewriter** in-animation (0.4 s) and a quick **fade-out** (0.2 s) after the smash-in of 2A, so it overlaps the first 0.4 s of 2A.
2. **"Guci" label** · 17.6–19.0 s · on 3C. Use a text layer ("Guci", small, black, sans-serif, slightly tilted to match the label) and place it on the blank label. Enable **motion tracking** on the clip so the text sticks. Hold it through the freeze.
3. **ID card** · 55.5–60.0 s · on 7B. Insert a card image as a PIP/overlay: slide in from bottom, rotated ~5°, ~60% screen width, with a drop shadow. Content: a woman's portrait (Salma's face, from `characters.md`) + the text layer "MANSOURI" and "ANFA" as separate text layers. Use a plain placeholder card background (no real ID layout/crest).
4. **Subtitles** · import `ep01.srt` (Text → Captions → Import). Style: bold white, black outline, bottom third, at least 90 px from the bottom edge (TikTok UI). Keep the line breaks.

## 4. Color grade
- **Whole episode:** slight teal-orange, contrast +10, grain 10.
- **Shot 1:** crush the blacks, desaturate −15, blue cast.
- **Shot 6B (flashback):** warm cast, sat −20, highlights +, soft glow, 4 px blur vignette. Add a 4-frame **white flash** at 48.0 and 52.0.

## 5. Smash cuts and freezes (summary)
| When | What |
|---|---|
| 2.3–2.5 s | freeze on Salma's scream |
| **2.5 s** | **SMASH TO BLACK**: kill all audio instantly (rain too) for 0.5 s |
| **3.0 s** | **SMASH IN** on the knife hit + bale burst (SFX peak) |
| 18.0–18.7 s | freeze on the "Guci" label (deadpan beat) |
| 59.0–60.0 s | freeze on Yahya's shocked face |
| **60.0 s** | **HARD CUT to black**, silence (no tail) |

## 6. SFX list (CapCut / free libraries)
| Time (s) | SFX |
|---|---|
| 0.0–2.5 | **heavy rain** (bed), distant thunder, **iron gate clang** at 0.3, **box thump + mud splat** at 1.2 |
| 1.6–2.5 | **glass window rattle/slap** under Salma's scream |
| 2.5–3.0 | silence (hard cut) |
| 3.0 | **knife slash** + cloth **whoosh/burst** (peak at 3.2) |
| 3.0–10.0 | **market ambience** (dawn: voices, hangers, carts), **tea-glass clink** at ~6.5 |
| 17.9 | **record-scratch / tiny "ding"** on the Guci freeze (keep it subtle) |
| 19.5 | **hanger click** |
| 20.0–31.5 | market ambience continues, **leather creak** at ~25, **footsteps** as the lady leaves ~30 |
| 35.0–45.0 | indoor room tone, **coins clinking** 35.0–37.0, **bread tearing/chewing** under Yahya |
| 45.0 | **three door knocks** (45.0, 45.4, 45.8), **wallet open** at 46.5 |
| 48.0–52.0 | music dips, soft **warm pad**; breath-y reverb tail |
| 52.0–55.5 | wet **footsteps**, distant traffic, **card click** (plastic) at ~54.5 |
| 55.5–60.0 | tension riser; **cut to dead silence at 60.0** |

## 7. Music
**Mood:** dry, tense-comic street drama. Sparse **oud / darbuka** with a dusty lo-fi beat, minor key, not full Maghrebi folk.
- **0–3 s:** none (rain only).
- **3–45 s:** start low (-18 dB), groove builds slightly at the market (3.0–10.0), ducks under dialogue (auto-duck −12 dB).
- **45–52 s:** drop out for the flashback; warm pad only.
- **52–60 s:** low pulse + riser to the cliffhanger. **Abrupt stop at 60.0.**
Use CapCut's built-in free tracks (commercial-safe) or a royalty-free source; check the licence for TikTok.

## 8. Export
1080×1920, 30 fps, high bitrate, H.264, **−14 LUFS** overall. Name it `ep01_final.mp4`. Check on a phone: subtitles not under the TikTok UI, voices over music, hook clear in the first 3 s.

## 9. Rough-cut check
Before finishing in CapCut, run `python3 build_animatic.py` to preview timing with whatever clips and voice files exist (placeholders fill the gaps).
