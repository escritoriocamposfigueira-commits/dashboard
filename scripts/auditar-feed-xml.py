#!/usr/bin/env python3
"""Audita o feed XML de imóveis contra o conteúdo do robô de publicações.

Uso:
  python scripts/auditar-feed-xml.py \
    --xml ../auditoria-xml/property-feed-2026-07-27.xml \
    --artes "D:/.../IMAGENS ANUNCIOS" \
    --json ../auditoria-xml/resultado-auditoria.json \
    --markdown ../auditoria-xml/resultado-auditoria.md
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import unquote


SPECIAL_ROBOT_TO_XML = {
    "CASAINDAIABERTIOGA": "FD1FEFC4",
    "CASAJARDIMARMENIA": "57D16D6F",
    "CASAVILAJUNDIAI": "A8FA0877",
    "TARLITORAL": "6FDA7DF2",
}

FOTOS_LEGACY_TO_XML = {
    "1F": "FD1FEFC4",
    "8F": "A8FA0877",
    "6F": "6FDA7DF2",
    "57D": "57D16D6F",
}


def ascii_upper(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).upper()


def compact(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", ascii_upper(value))


def canonical_xml_code(listing_id: str) -> str:
    value = ascii_upper(listing_id).strip()
    value = re.sub(r"^\s*CF\s*[- ]*", "", value)
    value = re.sub(r"[- ]*(VENDA|LOCACAO)\s*$", "", value)
    return compact(value)


def canonical_robot_code(code: str) -> str:
    value = compact(code)
    return SPECIAL_ROBOT_TO_XML.get(value, value)


def canonical_photo_key(code: str) -> str:
    value = compact(code)
    return FOTOS_LEGACY_TO_XML.get(value, canonical_robot_code(value))


def canonical_art_file(path: Path) -> str:
    value = compact(path.stem)
    value = re.sub(r"^CF", "", value)
    return SPECIAL_ROBOT_TO_XML.get(value, value)


def purpose(transaction_type: str) -> str:
    return "locacao" if transaction_type == "For Rent" else "venda"


def clean_text(node: ET.Element | None, path: str) -> str:
    if node is None:
        return ""
    found = node.find(path)
    return (found.text or "").strip() if found is not None else ""


def price_tokens(caption: str) -> set[int]:
    tokens: set[int] = set()
    for match in re.findall(r"\d[\d.,]*", caption or ""):
        digits = re.sub(r"\D", "", match)
        if digits:
            try:
                number = int(digits)
                tokens.add(number)
                if len(digits) > 2 and digits.endswith("00"):
                    tokens.add(number // 100)
            except ValueError:
                pass
    return tokens


def normalized_url(value: str) -> str:
    return unquote((value or "").strip()).replace(" ", "")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def audit(args: argparse.Namespace) -> dict:
    repo = Path(args.repo).resolve()
    root = ET.parse(args.xml).getroot()
    listings = list(root.findall("./Listings/Listing"))

    xml_items: list[dict] = []
    xml_by_code: dict[str, list[dict]] = defaultdict(list)
    for listing in listings:
        listing_id = clean_text(listing, "ListingID")
        code = canonical_xml_code(listing_id)
        item = {
            "listing_id": listing_id,
            "code": code,
            "purpose": purpose(clean_text(listing, "TransactionType")),
            "title": clean_text(listing, "Title"),
            "detail_url": clean_text(listing, "DetailViewUrl"),
            "property_type": clean_text(listing, "Details/PropertyType"),
            "description": clean_text(listing, "Details/Description"),
            "sale_price": int(clean_text(listing, "Details/ListPrice") or 0),
            "rental_price": int(clean_text(listing, "Details/RentalPrice") or 0),
            "bedrooms": int(clean_text(listing, "Details/Bedrooms") or 0),
            "bathrooms": int(clean_text(listing, "Details/Bathrooms") or 0),
            "garage": int(clean_text(listing, "Details/Garage") or 0),
            "city": clean_text(listing, "Location/City"),
            "neighborhood": clean_text(listing, "Location/Neighborhood"),
            "photos": [
                (item.text or "").strip()
                for item in listing.findall("./Media/Item")
                if (item.text or "").strip()
            ],
        }
        xml_items.append(item)
        xml_by_code[code].append(item)

    manifest = load_json(repo / "src/content/imagens-urls.json")
    captions = load_json(repo / "src/content/captions-imoveis.json")
    extra_photos = load_json(repo / "src/content/fotos-imoveis.json")

    robot_entries = []
    robot_by_canonical: dict[str, str] = {}
    for raw_code in map(str, manifest["ordem"]):
        code = canonical_robot_code(raw_code)
        robot_by_canonical[code] = raw_code
        robot_entries.append(
            {
                "robot_code": raw_code,
                "code": code,
                "story_url": manifest.get("urls", {}).get(raw_code),
                "feed_url": manifest.get("urls_feed", {}).get(raw_code),
            }
        )

    caption_by_canonical = {
        canonical_robot_code(str(item["codigo_imovel"])): item for item in captions
    }
    photos_by_canonical = {
        canonical_photo_key(str(key)): value for key, value in extra_photos.items()
    }

    xml_codes = set(xml_by_code)
    robot_codes = set(robot_by_canonical)

    missing_codes = sorted(xml_codes - robot_codes)
    unavailable_codes = sorted(robot_codes - xml_codes)

    arts = Path(args.artes).resolve() if args.artes else None
    feed_files: dict[str, str] = {}
    story_files: dict[str, str] = {}
    if arts:
        feed_dir = arts / "PROPORÇÃO 4.5"
        story_dir = arts / "proporção 9.16"
        feed_files = {
            canonical_art_file(path): str(path)
            for path in feed_dir.glob("*")
            if path.is_file()
        }
        story_files = {
            canonical_art_file(path): str(path)
            for path in story_dir.glob("*")
            if path.is_file()
        }

    missing_details = []
    for code in missing_codes:
        purposes = sorted({item["purpose"] for item in xml_by_code[code]})
        missing_details.append(
            {
                "code": code,
                "purposes": purposes,
                "listings": xml_by_code[code],
                "has_feed_art": code in feed_files,
                "feed_art": feed_files.get(code),
                "has_story_art": code in story_files,
                "story_art": story_files.get(code),
                "has_extra_photos": code in photos_by_canonical,
                "extra_photo_count": len(photos_by_canonical.get(code, [])),
            }
        )

    caption_issues = []
    for code in sorted(xml_codes & robot_codes):
        cap_item = caption_by_canonical.get(code)
        if not cap_item:
            caption_issues.append({"code": code, "issues": ["legenda ausente"]})
            continue
        caption = cap_item.get("caption", "")
        issues: list[str] = []
        expected_urls = {
            normalized_url(item["detail_url"]) for item in xml_by_code[code]
        }
        caption_url = normalized_url(caption)
        if not any(url and url in caption_url for url in expected_urls):
            issues.append("link específico ausente ou divergente")
        tokens = price_tokens(caption)
        for item in xml_by_code[code]:
            expected_price = item["rental_price"] if item["purpose"] == "locacao" else item["sale_price"]
            if expected_price > 0 and expected_price not in tokens:
                issues.append(
                    f"preço de {item['purpose']} divergente: XML={expected_price}"
                )
        if "wa.me/551123785643" not in caption:
            issues.append("WhatsApp obrigatório ausente")
        if "043649-J" not in caption:
            issues.append("CRECI obrigatório ausente")
        if issues:
            caption_issues.append({"code": code, "issues": issues})

    photo_issues = []
    for code in sorted(xml_codes & set(photos_by_canonical)):
        active_urls = {
            url for item in xml_by_code[code] for url in item.get("photos", [])
        }
        registered_urls = set(photos_by_canonical.get(code, []))
        foreign = sorted(registered_urls - active_urls)
        if foreign:
            photo_issues.append(
                {
                    "code": code,
                    "registered": len(registered_urls),
                    "not_in_xml": foreign,
                }
            )

    xml_listing_counts = Counter(item["purpose"] for item in xml_items)
    missing_listing_counts = Counter(
        item["purpose"]
        for code in missing_codes
        for item in xml_by_code[code]
    )

    return {
        "summary": {
            "xml_listings": len(xml_items),
            "xml_unique_properties": len(xml_codes),
            "xml_sales": xml_listing_counts["venda"],
            "xml_rentals": xml_listing_counts["locacao"],
            "robot_queue_entries": len(robot_entries),
            "robot_active_unique_properties": len(xml_codes & robot_codes),
            "missing_unique_properties": len(missing_codes),
            "missing_sales": missing_listing_counts["venda"],
            "missing_rentals": missing_listing_counts["locacao"],
            "robot_unavailable_properties": len(unavailable_codes),
        },
        "missing": missing_details,
        "robot_unavailable": [
            {
                "code": code,
                "robot_code": robot_by_canonical[code],
            }
            for code in unavailable_codes
        ],
        "caption_issues": caption_issues,
        "photo_issues": photo_issues,
        "xml_duplicate_codes": {
            code: [
                {
                    "listing_id": item["listing_id"],
                    "purpose": item["purpose"],
                    "price": item["rental_price"] or item["sale_price"],
                }
                for item in items
            ]
            for code, items in sorted(xml_by_code.items())
            if len(items) > 1
        },
        "robot_entries": robot_entries,
        "xml_items": xml_items,
    }


def render_markdown(result: dict) -> str:
    s = result["summary"]
    lines = [
        "# Auditoria XML × Robô de Publicações",
        "",
        "## Resumo",
        "",
        f"- XML: **{s['xml_listings']} anúncios** e **{s['xml_unique_properties']} imóveis únicos**.",
        f"- Venda: **{s['xml_sales']}**. Locação: **{s['xml_rentals']}**.",
        f"- Fila do robô: **{s['robot_queue_entries']} entradas**.",
        f"- Imóveis ativos já cobertos: **{s['robot_active_unique_properties']}**.",
        f"- Imóveis ativos ausentes: **{s['missing_unique_properties']}** "
        f"({s['missing_sales']} venda, {s['missing_rentals']} locação).",
        f"- Imóveis na fila que não aparecem no XML: **{s['robot_unavailable_properties']}**.",
        "",
        "## Imóveis ativos ausentes",
        "",
        "| Código | Finalidade | Arte feed | Arte story | Fotos extras |",
        "|---|---|---:|---:|---:|",
    ]
    for item in result["missing"]:
        lines.append(
            f"| {item['code']} | {', '.join(item['purposes'])} | "
            f"{'sim' if item['has_feed_art'] else 'não'} | "
            f"{'sim' if item['has_story_art'] else 'não'} | "
            f"{item['extra_photo_count']} |"
        )
    lines.extend(["", "## Entradas indisponíveis no XML", ""])
    if result["robot_unavailable"]:
        for item in result["robot_unavailable"]:
            lines.append(f"- `{item['robot_code']}`")
    else:
        lines.append("- Nenhuma.")
    lines.extend(["", "## Divergências de legenda", ""])
    if result["caption_issues"]:
        for item in result["caption_issues"]:
            lines.append(f"- `{item['code']}`: {'; '.join(item['issues'])}.")
    else:
        lines.append("- Nenhuma.")
    lines.extend(["", "## Divergências de fotos extras", ""])
    if result["photo_issues"]:
        for item in result["photo_issues"]:
            lines.append(
                f"- `{item['code']}`: {len(item['not_in_xml'])} URL(s) cadastrada(s) "
                "não aparecem mais no XML."
            )
    else:
        lines.append("- Nenhuma.")
    return "\n".join(lines) + "\n"


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--xml", required=True, type=Path)
    parser.add_argument("--repo", default=".", type=Path)
    parser.add_argument("--artes", type=Path)
    parser.add_argument("--json", type=Path)
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    result = audit(args)
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(payload + "\n", encoding="utf-8")
    if args.markdown:
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text(render_markdown(result), encoding="utf-8")
    print(
        json.dumps(result["summary"], ensure_ascii=False, indent=2)
        if args.quiet
        else payload
    )


if __name__ == "__main__":
    main()
