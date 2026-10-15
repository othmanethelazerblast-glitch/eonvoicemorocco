#!/usr/bin/env python3
"""Rough cut of EP1 (1080x1920, 60s): your clips + your recorded voice + ep01.srt.

  clips/<ID>.mp4   e.g. clips/1A.mp4 ... 7B.mp4   (missing ones become placeholder cards)
  voice/<who>.m4a  one take per character, >=1.5s of silence between lines, lines in order
  voice/<line id>.m4a  (optional) a single line, e.g. voice/03_yahya.m4a, overrides the take
  Falls back to the TTS guide (out/ep1_vo_track.mp3) when no recordings exist.

Usage: python3 build_animatic.py      ->  out/ep01_rough.mp4
"""
import json, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).parent
OUT, CLIPS, VOICE = HERE / "out", HERE / "clips", HERE / "voice"
OUT.mkdir(exist_ok=True)
W, H, FPS = 1080, 1920, 30
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
EXTS = (".mp4", ".mov", ".m4v", ".webm")
AUDIO = (".m4a", ".mp3", ".wav", ".aac", ".ogg", ".opus", ".aiff", ".flac")
lines = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))["lines"]

# (clip id, start, end, placeholder colour, placeholder text) -- keep in sync with shots.md
SHOTS = [
    ("1A", 0.0, 1.6, "0x0b0f1a", "Night rain - Hamid thrown out, sweets in the mud"),
    ("1B", 1.6, 2.5, "0x101830", "Salma at the window"),
    ("1C", 2.5, 3.0, "0x000000", "3 ashhor qbel..."),
    ("2A", 3.0, 5.5, "0x5a3b1e", "Knife slashes the bale"),
    ("2B", 5.5, 10.0, "0x6b4a2a", "Derb Ghallef at dawn"),
    ("3A", 10.0, 14.5, "0x7a2e55", "Yahya runs in, pink coat"),
    ("3B", 14.5, 17.5, "0x6a2a48", "Hamid does not look up"),
    ("3C", 17.5, 19.0, "0x5a2040", "Label macro - Guci overlay"),
    ("3D", 19.0, 20.0, "0x7a2e55", "Yahya hangs the coat back"),
    ("4A", 20.0, 24.0, "0x2f4a3a", "Lady haggles the jacket"),
    ("4B", 24.0, 28.5, "0x2a4034", "Thumb on the seam"),
    ("4C", 28.5, 31.5, "0x2f4a3a", "Lady hesitates, leaves"),
    ("4D", 31.5, 35.0, "0x35523f", "Yahya is hungry"),
    ("5A", 35.0, 37.0, "0x4a3a2a", "Mi Zhor counts coins"),
    ("5B", 37.0, 41.0, "0x54432f", "Yahya, mouth full of bread"),
    ("5C", 41.0, 45.0, "0x4a3a2a", "Mi Zhor - the proverb"),
    ("6A", 45.0, 48.0, "0x22222e", "Knock - empty wallet"),
    ("6B", 48.0, 52.0, "0x6a5530", "Flashback - the father"),
    ("7A", 52.0, 55.5, "0x1a2a4a", "Hamid steps on the ID card"),
    ("7B", 55.5, 60.0, "0x14203c", "Yahya - bent Mansouri - ID overlay"),
]


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def find(folder, stem, exts):
    return next((p for e in exts if (p := folder / f"{stem}{e}").exists()), None)


# ---- video ----
segs, missing = [], []
for cid, a, b, col, text in SHOTS:
    dur, seg, clip = b - a, OUT / f"seg_{cid}.mp4", find(CLIPS, cid, EXTS)
    enc = ["-r", str(FPS), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-an", str(seg)]
    if clip:
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},"
              f"tpad=stop_mode=clone:stop_duration={dur}")
        run(["ffmpeg", "-y", "-i", str(clip), "-vf", vf, "-t", str(dur)] + enc)
    else:
        missing.append(cid)
        (OUT / f"label_{cid}.txt").write_text(f"{cid}\n{text}", encoding="utf-8")
        big = cid == "1C"
        vf = (f"drawtext=fontfile={FONT}:textfile={OUT}/label_{cid}.txt:fontcolor=white:"
              f"fontsize={90 if big else 56}:line_spacing=30:x=(w-text_w)/2:y=(h-text_h)/2")
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={col}:s={W}x{H}:r={FPS}:d={dur}",
             "-vf", vf] + enc)
    segs.append(seg)
(OUT / "list.txt").write_text("".join(f"file '{s.name}'\n" for s in segs))
base = OUT / "base.mp4"
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(OUT / "list.txt"), "-c", "copy", str(base)])


# ---- voice ----
def speech_segments(path):
    p = subprocess.run(["ffmpeg", "-i", str(path), "-af", "silencedetect=noise=-35dB:d=0.8", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    total = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", p.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", p.stderr)]
    segs_, cur = [], 0.0
    for i, s in enumerate(starts):
        if s - cur > 0.15:
            segs_.append((cur, s))
        cur = ends[i] if i < len(ends) else total
    if total - cur > 0.15:
        segs_.append((cur, total))
    return segs_


placed = []  # (file, start)
for who in dict.fromkeys(l["who"] for l in lines):
    mine = [l for l in lines if l["who"] == who]
    take = find(VOICE, who, AUDIO)
    cut = None
    for l in mine:
        single = find(VOICE, l["id"], AUDIO)
        if single:
            placed.append((single, l["start"]))
        elif take:
            if cut is None:
                cut = speech_segments(take) if len(mine) > 1 else [(0.0, None)]
                if len(cut) != len(mine):
                    sys.exit(f"voice/{take.name}: found {len(cut)} lines, expected {len(mine)}. "
                             f"Leave >=1.5s of silence between lines, or record per-line files "
                             f"(voice/{mine[0]['id']}.m4a ...).")
            a, b = cut[mine.index(l)]
            f = OUT / f"cut_{l['id']}.wav"
            args = ["ffmpeg", "-y", "-i", str(take), "-ss", str(max(a - 0.1, 0))]
            if b is not None:
                args += ["-to", str(b + 0.1)]
            run(args + [str(f)])
            placed.append((f, l["start"]))

guide = OUT / "ep1_vo_track.mp3"
audio = None
if placed:
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-t", "60", "-i", "anullsrc=r=44100:cl=mono"]
    for f, _ in placed:
        cmd += ["-i", str(f)]
    fc = ";".join(f"[{i+1}:a]aresample=44100,aformat=channel_layouts=mono,adelay={int(s*1000)}:all=1[a{i}]"
                  for i, (_, s) in enumerate(placed))
    fc += ";[0:a]" + "".join(f"[a{i}]" for i in range(len(placed))) + \
          f"amix=inputs={len(placed)+1}:normalize=0,alimiter=limit=0.95[o]"
    audio = OUT / "voice_mix.m4a"
    run(cmd + ["-filter_complex", fc, "-map", "[o]", "-t", "60", "-c:a", "aac", str(audio)])
elif guide.exists():
    audio = guide

# ---- final ----
sub = (f"subtitles={HERE/'ep01.srt'}:force_style='FontName=DejaVu Sans,FontSize=9,Bold=1,Alignment=2,"
       f"MarginV=42,MarginL=10,MarginR=10,Outline=0.5'")
cmd = ["ffmpeg", "-y", "-i", str(base)] + (["-i", str(audio)] if audio else [])
run(cmd + ["-vf", sub, "-c:v", "libx264", "-pix_fmt", "yuv420p"] + (["-c:a", "aac", "-shortest"] if audio else [])
    + [str(OUT / "ep01_rough.mp4")])
print("done ->", OUT / "ep01_rough.mp4")
print("clips:", f"{len(SHOTS)-len(missing)}/{len(SHOTS)} real" + (f", placeholders: {', '.join(missing)}" if missing else ""))
print("voice:", "your recordings" if placed else ("TTS guide" if audio else "none yet"))
