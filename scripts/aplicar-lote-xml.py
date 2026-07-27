#!/usr/bin/env python3
"""Aplica ao robô o lote validado contra o feed XML.

O script atualiza os manifestos, legendas e carrosséis, copia as artes finais
para o repositório e mantém as duas pastas-mestre de artes sincronizadas.
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path
from urllib.parse import quote


BRANCH = "claude/campos-figueira-growth-qmjsux"
RAW_BASE = (
    "https://raw.githubusercontent.com/"
    "escritoriocamposfigueira-commits/dashboard/refs/heads/"
    f"{BRANCH}/public"
)
NEW_CODES = ["417", "421", "440", "459", "537", "574", "598", "619", "620"]
REGENERATED_FEED = {
    "417", "421", "440", "537", "541", "575", "598", "617", "619", "620"
}
REGENERATED_STORY = {
    "417", "421", "440", "459", "537", "541", "574", "575",
    "598", "617", "619", "620",
}
SPECIAL_ROBOT_TO_XML = {
    "CASA INDAIA BERTIOGA": "FD1FEFC4",
    "CASA JARDIM ARMENIA": "57D16D6F",
    "CASA VILA JUNDIAI": "A8FA0877",
    "TARLITORAL": "6FDA7DF2",
}
SPECIAL_PHOTO_ALIASES = {
    "CASA INDAIA BERTIOGA": "1F",
    "CASA JARDIM ARMENIA": "57D",
    "CASA VILA JUNDIAI": "8F",
    "TARLITORAL": "6F",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, value) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def robot_to_xml(code: str) -> str:
    return SPECIAL_ROBOT_TO_XML.get(code, code)


def clean_detail_url(url: str, code: str) -> str:
    base = (url or "").replace(" ", "").strip()
    return base or f"https://www.escritoriocamposfigueira.com.br/imovel/CF-{code}"


def make_caption(
    *,
    code: str,
    opening: str,
    title: str,
    price: str,
    facts: list[str],
    condition: str,
    keyword: str,
    purpose: str = "venda",
) -> str:
    link = f"https://www.escritoriocamposfigueira.com.br/imovel/CF-{code}"
    action = "agendar uma visita" if purpose == "locacao" else "conhecer de perto"
    facts_text = "\n".join(f"✅ {fact}" for fact in facts)
    keyword_url = quote(f"Tenho interesse no {keyword}", safe="")
    return (
        f"{opening}\n\n"
        f"🏡 {title}\n"
        f"💰 {price}\n\n"
        f"{facts_text}\n\n"
        f"💡 {condition}\n\n"
        f"Se este imóvel combina com o momento que você quer viver, fale agora "
        f"com a nossa equipe para {action}.\n\n"
        f"📸 Veja TODAS as fotos e os detalhes deste imóvel:\n"
        f"🔗 {link}\n\n"
        f"👇 Mande “{keyword}” no WhatsApp:\n"
        f"📲 https://wa.me/551123785643?text={keyword_url}\n\n"
        "Escritório Campos Figueira\n"
        "📧 escritoriocamposfigueira@gmail.com\n"
        "📲 instagram.com/escritorio.figueira\n"
        "📮 facebook.com/Escritorio.figueira\n"
        "✅ escritoriocamposfigueira.com.br\n"
        "⏰ Seg a Sex · 10h às 18h\n"
        "CRECI: 043649-J\n\n"
        "#mogidascruzes #imoveismogi #imovelmogi #imobiliariamogi "
        "#vendaimoveis #casaavenda #apartamentomogi #altotiete"
    )


CAPTIONS = {
    "417": make_caption(
        code="417",
        opening="Mais espaço muda a rotina inteira da família — inclusive os planos para o futuro.",
        title="Sobrado no Jardim Santa Teresa, Mogi das Cruzes",
        price="R$ 370.000",
        facts=["3 dormitórios, sendo 1 suíte", "2 banheiros", "Garagem para até 6 carros", "Quintal amplo"],
        condition="Aceita financiamento ou 50% de entrada + parcelas em notas promissórias.",
        keyword="SANTA TERESA 417",
    ),
    "421": make_caption(
        code="421",
        opening="Um sobrado amplo, bem distribuído e pronto para virar o endereço da sua próxima fase.",
        title="Sobrado na Vila Bernadotti — Brás Cubas",
        price="R$ 430.000",
        facts=["210 m²", "3 dormitórios, sendo 1 suíte", "2 banheiros", "2 vagas de garagem"],
        condition="Aceita financiamento bancário.",
        keyword="BRÁS CUBAS 421",
    ),
    "429": make_caption(
        code="429",
        opening="Sair do aluguel pode começar com um apartamento prático, térreo e dentro do seu orçamento.",
        title="Apartamento térreo no Jardim Esperança",
        price="R$ 220.000",
        facts=["2 dormitórios", "1 banheiro", "Vaga de garagem rotativa", "Acesso fácil por estar no térreo"],
        condition="Aceita financiamento bancário ou direto; avalia terreno ou casa no litoral.",
        keyword="ESPERANÇA 429",
    ),
    "440": make_caption(
        code="440",
        opening="Quintal, churrasqueira e espaço de verdade para a família aproveitar a própria casa.",
        title="Casa no Parque Olímpico, Mogi das Cruzes",
        price="R$ 400.000",
        facts=["2 dormitórios, sendo 1 suíte", "Sala e cozinha", "Quintal com churrasqueira", "Garagem para 2 carros"],
        condition="Aceita financiamento bancário ou financiamento direto.",
        keyword="PARQUE OLÍMPICO 440",
    ),
    "458": make_caption(
        code="458",
        opening="Quando a família cresce, o lar também precisa acompanhar — com conforto em cada ambiente.",
        title="Sobrado no Jardim Universo, Mogi das Cruzes",
        price="R$ 450.000",
        facts=["3 dormitórios, sendo 1 suíte", "3 banheiros", "2 vagas cobertas", "Ambientes amplos e bem distribuídos"],
        condition="Aceita financiamento bancário, financiamento direto e permuta.",
        keyword="UNIVERSO 458",
    ),
    "459": make_caption(
        code="459",
        opening="Seu primeiro imóvel pode unir preço acessível, lazer e segurança para a família.",
        title="Apartamento no Conjunto Residencial do Bosque",
        price="R$ 170.000",
        facts=["2 dormitórios", "1 banheiro", "1 vaga de garagem", "Quadra, salão e playgrounds"],
        condition="Aceita financiamento bancário.",
        keyword="BOSQUE 459",
    ),
    "537": make_caption(
        code="537",
        opening="Praticidade para morar bem hoje e potencial de valorização para o seu patrimônio amanhã.",
        title="Sobrado em Cezar de Souza, Mogi das Cruzes",
        price="R$ 410.000",
        facts=["2 dormitórios, sendo 1 suíte", "Cozinha americana", "1 banheiro", "2 vagas de garagem"],
        condition="Aceita financiamento.",
        keyword="CEZAR 537",
    ),
    "541": make_caption(
        code="541",
        opening="Aqui o patrimônio não fica parado: ele já nasce com potencial de renda todos os meses.",
        title="Salão comercial + 4 casas na Vila São Sebastião",
        price="R$ 400.000",
        facts=["Conjunto com salão comercial e 4 casas", "4 dormitórios e 4 banheiros no total", "Renda de até R$ 3.000 por mês", "Múltiplas possibilidades de uso"],
        condition="Proprietário aceita proposta.",
        keyword="RENDA 541",
    ),
    "574": make_caption(
        code="574",
        opening="Uma casa térrea para viver com praticidade e reunir quem você ama em um espaço especial.",
        title="Casa térrea no Parque Maria Helena, Suzano",
        price="R$ 395.000",
        facts=["3 dormitórios", "1 banheiro", "2 vagas de garagem", "Espaço gourmet com churrasqueira e forno"],
        condition="Aceita financiamento bancário.",
        keyword="MARIA HELENA 574",
    ),
    "575": make_caption(
        code="575",
        opening="Um patrimônio completo para quem busca espaço, renda e um investimento com presença.",
        title="Imóvel com renda na Vila Jundiaí, Mogi das Cruzes",
        price="R$ 2.000.000",
        facts=["6 dormitórios", "4 banheiros", "Casas + salão comercial", "Renda aproximada de R$ 6.000 por mês"],
        condition="Venda somente à vista.",
        keyword="RENDA 575",
    ),
    "598": make_caption(
        code="598",
        opening="Quinhentos metros quadrados para transformar plano em construção e terreno em patrimônio.",
        title="Terreno na Porteira Preta, São Paulo",
        price="R$ 150.000",
        facts=["500 m²", "Medidas de 10 x 50 m", "Região em expansão", "Ótimo para construir ou investir"],
        condition="Aceita carro como parte do pagamento e entrada + parcelas direto.",
        keyword="TERRENO 598",
    ),
    "617": make_caption(
        code="617",
        opening="O projeto da casa dos seus sonhos começa pela escolha do terreno certo.",
        title="Terreno no condomínio Real Park II, Mogi das Cruzes",
        price="R$ 460.000",
        facts=["300 m²", "Medidas de 12 x 25 m", "Condomínio fechado", "Portaria 24 horas"],
        condition="Região em valorização e estrutura para construir com mais segurança.",
        keyword="REAL PARK 617",
    ),
    "619": make_caption(
        code="619",
        opening="Espaço para a família, quintal para respirar e praticidade para a rotina começar mais leve.",
        title="Casa térrea para locação em Jundiapeba",
        price="R$ 2.000/mês",
        facts=["3 dormitórios", "2 banheiros", "Garagem para até 4 carros", "Cômodo independente e banheiro nos fundos"],
        condition="Garantia por caução de 2 meses ou fiador.",
        keyword="LOCAÇÃO 619",
        purpose="locacao",
    ),
    "620": make_caption(
        code="620",
        opening="Morar com lazer, segurança e espaço para criar boas lembranças todos os dias.",
        title="Sobrado em condomínio no Mogi Moderno",
        price="R$ 2.600/mês",
        facts=["3 dormitórios, sendo 1 suíte", "Área gourmet", "2 vagas cobertas", "Piscinas, salão de festas e playground"],
        condition="Condomínio com portão eletrônico e estrutura de lazer.",
        keyword="CONDOMÍNIO 620",
        purpose="locacao",
    ),
}


def inject_specific_link(caption: str, url: str) -> str:
    compact = caption.replace(" ", "")
    if url.replace(" ", "") in compact:
        return caption
    block = f"📸 Veja TODAS as fotos deste imóvel:\n🔗 {url}\n\n"
    markers = ["👇", "Manda “", 'Manda "', "Mande “"]
    positions = [caption.find(marker) for marker in markers if caption.find(marker) >= 0]
    if positions:
        pos = min(positions)
        return caption[:pos] + block + caption[pos:]
    return caption.rstrip() + "\n\n" + block.rstrip()


def copy_arts(repo: Path, arts_root: Path) -> None:
    generated = repo / "arte-gerada" / "xml-2026-07-27"
    source_feed = arts_root / "PROPORÇÃO 4.5"
    source_story = arts_root / "proporção 9.16"
    public_feed = repo / "public" / "anuncios-feed"
    public_story = repo / "public" / "anuncios"
    for directory in (source_feed, source_story, public_feed, public_story):
        directory.mkdir(parents=True, exist_ok=True)

    for code in sorted(REGENERATED_FEED):
        src = generated / code / f"CF - {code} - FEED.png"
        if not src.is_file():
            raise FileNotFoundError(src)
        shutil.copy2(src, source_feed / f"CF - {code}.png")
        shutil.copy2(src, public_feed / f"CF - {code}.png")

    for code in sorted(REGENERATED_STORY):
        src = generated / code / f"CF - {code} - STORY.png"
        if not src.is_file():
            raise FileNotFoundError(src)
        shutil.copy2(src, source_story / f"CF - {code}.png")
        shutil.copy2(src, public_story / f"CF - {code}.png")

    # Estes dois feeds já existiam e foram preservados porque estavam corretos.
    for code in ("459", "574"):
        src = source_feed / f"CF - {code}.png"
        if not src.is_file():
            raise FileNotFoundError(src)
        shutil.copy2(src, public_feed / src.name)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--audit-json", type=Path, required=True)
    parser.add_argument("--arts-root", type=Path, required=True)
    args = parser.parse_args()
    repo = args.repo.resolve()
    audit = load_json(args.audit_json)
    xml_by_code: dict[str, list[dict]] = {}
    for item in audit["xml_items"]:
        xml_by_code.setdefault(str(item["code"]), []).append(item)

    manifest_path = repo / "src/content/imagens-urls.json"
    captions_path = repo / "src/content/captions-imoveis.json"
    photos_path = repo / "src/content/fotos-imoveis.json"
    manifest = load_json(manifest_path)
    captions = load_json(captions_path)
    photos = load_json(photos_path)

    manifest["ordem"] = [
        str(code) for code in manifest["ordem"] if str(code) != "527"
    ]
    for code in NEW_CODES:
        if code not in manifest["ordem"]:
            manifest["ordem"].append(code)
    manifest.get("urls", {}).pop("527", None)
    manifest.get("urls_feed", {}).pop("527", None)
    for code in NEW_CODES:
        encoded = quote(f"CF - {code}.png")
        manifest.setdefault("urls", {})[code] = f"{RAW_BASE}/anuncios/{encoded}"
        manifest.setdefault("urls_feed", {})[code] = (
            f"{RAW_BASE}/anuncios-feed/{encoded}"
        )
    manifest["gerado_em"] = datetime.now().astimezone().isoformat(timespec="seconds")

    caption_map = {
        str(item["codigo_imovel"]): item
        for item in captions
        if str(item["codigo_imovel"]) != "527"
    }
    for code, caption in CAPTIONS.items():
        caption_map[code] = {
            "codigo_imovel": code,
            "arquivo": f"CF - {code}.png",
            "caption": caption,
        }
    for robot_code, item in caption_map.items():
        xml_code = robot_to_xml(robot_code)
        listings = xml_by_code.get(xml_code, [])
        if listings:
            specific_url = clean_detail_url(listings[0].get("detail_url", ""), xml_code)
            item["caption"] = inject_specific_link(item.get("caption", ""), specific_url)
    captions = [caption_map[code] for code in manifest["ordem"]]

    photos.pop("527", None)
    for code in NEW_CODES:
        listing = xml_by_code[code][0]
        photos[code] = listing.get("photos", [])[:9]
    for robot_code, legacy_key in SPECIAL_PHOTO_ALIASES.items():
        if legacy_key in photos:
            photos[robot_code] = list(photos[legacy_key])

    copy_arts(repo, args.arts_root.resolve())
    save_json(manifest_path, manifest)
    save_json(captions_path, captions)
    save_json(photos_path, photos)
    print(
        json.dumps(
            {
                "fila": len(manifest["ordem"]),
                "legendas": len(captions),
                "imoveis_com_carrossel": len(photos),
                "adicionados": NEW_CODES,
                "removido": "527",
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
