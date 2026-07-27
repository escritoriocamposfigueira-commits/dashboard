#!/usr/bin/env python3
"""Valida dimensões, pares e duplicações das artes de feed/story."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


SPECIAL = {
    "CASAINDAIABERTIOGA": "FD1FEFC4",
    "CASAJARDIMARMENIA": "57D16D6F",
    "CASAVILAJUNDIAI": "A8FA0877",
    "TARLITORAL": "6FDA7DF2",
}


def compact(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_value = "".join(
        ch for ch in normalized if not unicodedata.combining(ch)
    ).upper()
    return re.sub(r"[^A-Z0-9]", "", ascii_value)


def code_from_file(path: Path) -> str:
    value = re.sub(r"^CF", "", compact(path.stem))
    return SPECIAL.get(value, value)


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def visual_vector(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        rgb = image.convert("RGB").resize((64, 64), Image.Resampling.LANCZOS)
        arr = np.asarray(rgb, dtype=np.float32) / 255.0
    return arr.reshape(-1)


def correlation(a: np.ndarray, b: np.ndarray) -> float:
    a = a - a.mean()
    b = b - b.mean()
    denominator = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denominator) if denominator else 0.0


def inspect_folder(folder: Path) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for path in sorted(folder.glob("*.png")):
        with Image.open(path) as image:
            width, height = image.size
        result[code_from_file(path)] = {
            "path": str(path),
            "filename": path.name,
            "width": width,
            "height": height,
            "ratio": width / height,
            "sha256": digest(path),
        }
    return result


def contact_sheets(items: dict[str, dict], output: Path, prefix: str) -> list[str]:
    output.mkdir(parents=True, exist_ok=True)
    files = [(code, Path(meta["path"])) for code, meta in sorted(items.items())]
    generated: list[str] = []
    columns, rows = 3, 2
    cell_w, cell_h, label_h = 420, 560, 42
    page_size = columns * rows
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 24)
    for page_index in range(0, len(files), page_size):
        canvas = Image.new(
            "RGB", (columns * cell_w, rows * (cell_h + label_h)), "#111111"
        )
        draw = ImageDraw.Draw(canvas)
        for local_index, (code, path) in enumerate(
            files[page_index : page_index + page_size]
        ):
            col = local_index % columns
            row = local_index // columns
            x = col * cell_w
            y = row * (cell_h + label_h)
            with Image.open(path) as image:
                preview = image.convert("RGB")
                preview.thumbnail((cell_w - 12, cell_h - 12), Image.Resampling.LANCZOS)
            px = x + (cell_w - preview.width) // 2
            py = y + 6 + (cell_h - preview.height) // 2
            canvas.paste(preview, (px, py))
            draw.rectangle(
                (x, y + cell_h, x + cell_w, y + cell_h + label_h), fill="#050505"
            )
            draw.text(
                (x + 12, y + cell_h + 7),
                f"CF-{code}",
                fill="#F4C34F",
                font=font,
            )
        out = output / f"{prefix}-{page_index // page_size + 1:02d}.jpg"
        canvas.save(out, quality=90)
        generated.append(str(out))
    return generated


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--artes", required=True, type=Path)
    parser.add_argument("--xml-codes", type=Path)
    parser.add_argument("--json", type=Path)
    parser.add_argument("--contatos", type=Path)
    args = parser.parse_args()

    feed = inspect_folder(args.artes / "PROPORÇÃO 4.5")
    story = inspect_folder(args.artes / "proporção 9.16")
    paired = sorted(set(feed) & set(story))

    pair_scores = []
    for code in paired:
        pair_scores.append(
            {
                "code": code,
                "correlation": round(
                    correlation(
                        visual_vector(Path(feed[code]["path"])),
                        visual_vector(Path(story[code]["path"])),
                    ),
                    4,
                ),
            }
        )

    exact_duplicates = []
    for kind, items in (("feed", feed), ("story", story)):
        by_hash: dict[str, list[str]] = {}
        for code, meta in items.items():
            by_hash.setdefault(meta["sha256"], []).append(code)
        for codes in by_hash.values():
            if len(codes) > 1:
                exact_duplicates.append({"kind": kind, "codes": sorted(codes)})

    result = {
        "summary": {
            "feed_count": len(feed),
            "story_count": len(story),
            "paired_count": len(paired),
            "feed_only": len(set(feed) - set(story)),
            "story_only": len(set(story) - set(feed)),
            "exact_duplicate_groups": len(exact_duplicates),
        },
        "feed_dimensions": dict(
            Counter(f"{item['width']}x{item['height']}" for item in feed.values())
        ),
        "story_dimensions": dict(
            Counter(f"{item['width']}x{item['height']}" for item in story.values())
        ),
        "feed_only": sorted(set(feed) - set(story)),
        "story_only": sorted(set(story) - set(feed)),
        "exact_duplicates": exact_duplicates,
        "pair_scores": pair_scores,
    }

    if args.contatos:
        result["contact_sheets"] = {
            "feed": contact_sheets(feed, args.contatos, "feed"),
            "story": contact_sheets(story, args.contatos, "story"),
        }
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(payload + "\n", encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
