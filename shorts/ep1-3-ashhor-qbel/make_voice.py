#!/usr/bin/env python3
"""Generate Darija voice lines (edge-tts, needs internet) and mix them on the 60s timeline.
Usage:  pip install edge-tts && python3 make_voice.py
Output: out/<id>.mp3 per line  +  out/ep1_vo_track.mp3 (60s, lines placed at their start times)
"""
import asyncio, json, subprocess, pathlib
import edge_tts

HERE = pathlib.Path(__file__).parent
OUT = HERE / "out"; OUT.mkdir(exist_ok=True)
cfg = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))

async def render(line):
    v = cfg["voices"][line["who"]]
    path = OUT / f"{line['id']}.mp3"
    await edge_tts.Communicate(line["text"], v["voice"], rate=v["rate"], pitch=v["pitch"]).save(str(path))
    return path

async def main():
    await asyncio.gather(*(render(l) for l in cfg["lines"]))
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-t", "60", "-i", "anullsrc=r=24000:cl=mono"]
    for l in cfg["lines"]:
        cmd += ["-i", str(OUT / f"{l['id']}.mp3")]
    parts = [f"[{i+1}:a]adelay={int(l['start']*1000)}:all=1[a{i}]" for i, l in enumerate(cfg["lines"])]
    mix = "".join(f"[a{i}]" for i in range(len(cfg["lines"])))
    fc = ";".join(parts) + f";[0:a]{mix}amix=inputs={len(cfg['lines'])+1}:normalize=0[o]"
    cmd += ["-filter_complex", fc, "-map", "[o]", "-t", "60", str(OUT / "ep1_vo_track.mp3")]
    subprocess.run(cmd, check=True)
    print("done ->", OUT / "ep1_vo_track.mp3")

asyncio.run(main())
