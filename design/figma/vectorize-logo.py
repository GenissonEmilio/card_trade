from pathlib import Path
import cv2, numpy as np, potrace
root=Path(__file__).resolve().parents[2]
source=Path(r'C:\Users\vinic\AppData\Local\Temp\codex-clipboard-4fde2c56-b8a4-437a-9bcb-4a090f04a8e2.png')
im=cv2.imread(str(source),0)
mask=im>175
def pt(p): return f'{p.x:.2f} {p.y:.2f}'
parts=[]
for curve in potrace.Bitmap(~mask).trace(turdsize=12,alphamax=1,opticurve=True,opttolerance=.3):
    parts.append('M'+pt(curve.start_point))
    for s in curve:
        parts.append('L'+pt(s.c)+' '+pt(s.end_point) if s.is_corner else 'C'+pt(s.c1)+' '+pt(s.c2)+' '+pt(s.end_point))
    parts.append('Z')
svg='<svg xmlns="http://www.w3.org/2000/svg" width="1774" height="887" viewBox="0 0 1774 887" role="img"><title>Duelink</title><path fill="#ffffff" fill-rule="evenodd" d="'+' '.join(parts)+'"/></svg>'
out=root/'public/brand/duelink-logo-completa-vetor.svg'
out.write_text(svg,encoding='utf-8')
print(str(out),len(svg),'bytes')
