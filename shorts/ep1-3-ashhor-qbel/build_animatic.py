#!/usr/bin/env python3
"""Build a 60s vertical animatic (1080x1920): scene cards + timed Darija subtitles (+ VO track if present).
Usage: python3 build_animatic.py        (run make_voice.py first to include audio)
Output: out/ep1_animatic.mp4, out/ep1.srt
"""
import json, pathlib, subprocess
HERE = pathlib.Path(__file__).parent; OUT = HERE / "out"; OUT.mkdir(exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
lines = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))["lines"]

SCENES = [  # (start, end, bg color, title, description)
 (0, 3,   "0x0b0f1a", "NUIT / PLUIE",       "Hamid jete dehors du portail. Les gateaux dans la boue.\\n3 ashhor qbel..."),
 (3, 10,  "0x5a3b1e", "AUBE - DERB GHALLEF","Le couteau fend la balle. Les vetements explosent."),
 (10, 20, "0x7a2e55", "YAHYA ET LE MANTEAU", "Manteau rose. Etiquette Guci."),
 (20, 35, "0x2f4a3a", "LA VESTE EN CUIR",    "La dame marchande a 50 dh. Pouce sur la couture."),
 (35, 45, "0x4a3a2a", "MAISON - MI ZHOR",    "Il manque 300 dh de loyer."),
 (45, 52, "0x22222e", "LE PORTEFEUILLE",     "Une photo, zero dirham. Flashback du pere."),
 (52, 60, "0x1a2a4a", "LA CARTE D IDENTITE", "Photo de femme, adresse a Anfa. CUT."),
]
def ts(t): h=int(t//3600); m=int(t%3600//60); s=t%60; return f"{h:02}:{m:02}:{s:06.3f}".replace(".",",")
srt=[]
for i,l in enumerate(lines):
    end = lines[i+1]["start"]-0.1 if i+1<len(lines) else 60
    end = min(end, l["start"]+max(2.0, len(l["latin"])*0.07))
    srt.append(f"{i+1}\n{ts(l['start'])} --> {ts(end)}\n{l['who'].upper()}: {l['latin']}\n")
(OUT/"ep1.srt").write_text("\n".join(srt),encoding="utf-8")

segs=[]
for n,(a,b,col,title,desc) in enumerate(SCENES):
    seg=OUT/f"seg{n}.mp4"; segs.append(seg)
    vf=(f"drawtext=fontfile={FONT}:text='{title}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=600,"
        f"drawtext=fontfile={FONT}:text='{desc}':fontcolor=0xdddddd:fontsize=40:x=(w-text_w)/2:y=760")
    subprocess.run(["ffmpeg","-y","-loglevel","error","-f","lavfi","-i",f"color=c={col}:s=1080x1920:r=30:d={b-a}","-vf",vf,"-pix_fmt","yuv420p",str(seg)],check=True)
(OUT/"list.txt").write_text("".join(f"file '{s.name}'\n" for s in segs))
base=OUT/"base.mp4"
subprocess.run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(OUT/"list.txt"),"-c","copy",str(base)],check=True)
sub=f"subtitles={OUT/'ep1.srt'}:force_style='FontName=DejaVu Sans,FontSize=9,Bold=1,Alignment=2,MarginV=42,MarginL=10,MarginR=10,Outline=0.5'"
cmd=["ffmpeg","-y","-loglevel","error","-i",str(base)]
vo=OUT/"ep1_vo_track.mp3"
if vo.exists(): cmd+=["-i",str(vo),"-c:a","aac","-shortest"]
cmd+=["-vf",sub,"-c:v","libx264","-pix_fmt","yuv420p",str(OUT/"ep1_animatic.mp4")]
subprocess.run(cmd,check=True); print("done ->",OUT/"ep1_animatic.mp4", "(with audio)" if vo.exists() else "(no audio yet: run make_voice.py)")
