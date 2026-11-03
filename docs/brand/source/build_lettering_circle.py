"""Vectorize the supplied wordmark and reconstruct its obscured circular swoosh.

The SVG contains editable paths only: no embedded bitmap and no font dependency.
Requires opencv-python, numpy, potracer, resvg-py. The raster is read only as a
contour reference; PNG deliverables are rendered directly from the finished SVG.
"""

from pathlib import Path
import argparse
import xml.etree.ElementTree as ET

import cv2
import numpy as np
import potrace
import resvg_py


def vector_path(mask: np.ndarray) -> str:
    ys, xs = np.nonzero(mask)
    left, top = max(0, int(xs.min()) - 3), max(0, int(ys.min()) - 3)
    right, bottom = int(xs.max()) + 4, int(ys.max()) + 4
    bitmap = potrace.Bitmap(mask[top:bottom, left:right] == 0)
    curves = bitmap.trace(turdsize=12, alphamax=1, opttolerance=0.25)

    def xy(point):
        return f"{point.x + left:.2f} {point.y + top:.2f}"

    commands = []
    for curve in curves:
        commands.append(f"M {xy(curve.start_point)}")
        for segment in curve:
            if segment.is_corner:
                commands.append(f"L {xy(segment.c)} {xy(segment.end_point)}")
            else:
                commands.append(
                    f"C {xy(segment.c1)} {xy(segment.c2)} {xy(segment.end_point)}"
                )
        commands.append("Z")
    return " ".join(commands)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    reference = cv2.imread(str(args.reference))
    if reference is None or reference.shape[:2] != (887, 1774):
        raise ValueError("Expected the supplied 1774 x 887 monochrome reference.")
    white = cv2.inRange(reference, (180, 180, 180), (255, 255, 255))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(white)

    # Identify the seven large, separate letter faces, excluding the connected
    # outer keyline, card remnants, chain link, ring and peripheral decorations.
    letters = []
    for component in range(1, count):
        x, y, width, height, area = stats[component]
        if y >= 390 and height > 220 and area > 15000:
            letters.append((int(x), labels == component))
    letters.sort(key=lambda item: item[0])
    if len(letters) != 7:
        raise ValueError(f"Expected exactly seven letter faces, found {len(letters)}")

    letter_masks = [(letter, mask.astype(np.uint8) * 255)
                    for letter, (_, mask) in zip("DUELINK", letters)]
    face_mask = np.zeros_like(white)
    for _, mask in letter_masks:
        face_mask |= mask

    # Construct the dark wordmark backing as a union, without the portions of
    # the reference keyline that ran around the removed cards and rays.
    backing = cv2.dilate(face_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (49, 49)))
    # Keep the keyline around the wordmark silhouette rather than letting it
    # descend into narrow spaces between individual letter strokes.
    padded = np.pad(backing, 128)
    padded = cv2.morphologyEx(
        padded, cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (129, 129)),
    )
    backing = padded[128:-128, 128:-128]
    contours, _ = cv2.findContours(backing, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    backing[:] = 0
    cv2.drawContours(backing, contours, -1, 255, cv2.FILLED)

    ring = (
        "M 1360 411 C 1329 213 1170 75 957 77 "
        "C 721 78 508 204 435 395 C 376 549 449 699 628 792 "
        "C 801 881 1036 857 1187 733 C 1304 639 1386 523 1360 411 Z "
        "M 1319 413 C 1278 218 1132 115 943 117 "
        "C 728 119 548 231 480 406 C 429 542 501 668 654 747 "
        "C 811 830 1027 806 1165 698 C 1268 613 1335 512 1319 413 Z"
    )
    paths = "\n".join(
        f'    <path id="letra-{letter.lower()}" d="{vector_path(mask)}"/>'
        for letter, mask in letter_masks
    )
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1774" height="820" viewBox="0 40 1774 820" fill="none" role="img" aria-labelledby="title description">
  <title id="title">Duelink — letreiro e círculo</title>
  <desc id="description">Letreiro dourado DUELINK sobre um círculo dinâmico ciano. Fundo transparente. Arte vetorial em curvas, sem cartas, elo ou raios.</desc>
  <defs>
    <linearGradient id="dourado" x1="880" y1="395" x2="880" y2="785" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8DE97"/>
      <stop offset="0.48" stop-color="#E9C275"/>
      <stop offset="1" stop-color="#DDA343"/>
    </linearGradient>
    <linearGradient id="ciano" x1="650" y1="95" x2="1130" y2="835" gradientUnits="userSpaceOnUse">
      <stop stop-color="#A0E9E5"/>
      <stop offset="0.5" stop-color="#42D4DE"/>
      <stop offset="1" stop-color="#1898AD"/>
    </linearGradient>
  </defs>
  <g id="circulo" stroke-linejoin="round" fill-rule="evenodd">
    <path d="{ring}" stroke="#F7F5EE" stroke-width="18"/>
    <path id="faixa-circular" d="{ring}" fill="url(#ciano)" stroke="#0C0F12" stroke-width="7"/>
    <path id="recorte-superior" d="M 1049 91 C 1192 119 1303 204 1352 320 C 1278 195 1159 134 1049 123 L 1124 114 Z" fill="#0C0F12"/>
    <path id="luz-superior" d="M 549 250 C 661 131 841 88 989 94 C 808 101 659 154 549 250 Z" fill="#C1F5F0" stroke="none"/>
    <path id="recorte-inferior" d="M 659 760 C 803 835 989 817 1119 746 C 990 839 792 857 659 760 Z" fill="#0C0F12"/>
  </g>
  <g id="letreiro">
    <path id="contorno-letreiro" d="{vector_path(backing)}" fill="#0C0F12" stroke="#F7F5EE" stroke-width="11" stroke-linejoin="round"/>
    <g id="letras" fill="url(#dourado)" fill-rule="evenodd">
{paths}
    </g>
  </g>
</svg>
'''
    root = ET.fromstring(svg)
    if any(node.tag.rsplit('}', 1)[-1] in ('image', 'text') for node in root.iter()):
        raise AssertionError("Only native vector paths are permitted.")
    args.destination.mkdir(parents=True, exist_ok=True)
    output = args.destination / "duelink-letreiro-circulo.svg"
    output.write_text(svg, encoding="utf-8")
    for suffix, background in [("", None), ("-preview", "#0C0F12"), ("-fundo-claro", "#FFFFFF")]:
        target = output.with_name(output.stem + suffix).with_suffix(".png")
        target.write_bytes(resvg_py.svg_to_bytes(svg_string=svg, width=1774, background=background))
    print(f"Saved {output} ({output.stat().st_size} bytes); seven traced letters and editable circle paths.")


if __name__ == "__main__":
    main()
