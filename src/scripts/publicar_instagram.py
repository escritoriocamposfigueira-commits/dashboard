"""
publicar_instagram.py — Publicação automática de carrossel no Instagram e Facebook
Escritório Campos Figueira — Meta Graph API v22.0

Uso:
  python publicar_instagram.py --slides slide_1.png slide_2.png --caption "texto"
  python publicar_instagram.py --slides slides/*.png --caption "texto" --grupos
  python publicar_instagram.py --slides slides/*.png --caption "texto" --dry-run
"""

import argparse
import os
import sys
import time
import json
import requests
from pathlib import Path

# Carregar .env.local automaticamente (sem depender de python-dotenv)
def _load_env():
    for name in (".env.local", ".env"):
        p = Path(__file__).parent.parent.parent / name
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            break

_load_env()

BASE_URL = "https://graph.facebook.com/v22.0"
PAGE_ID = "512040582222121"
IG_USER_ID = "17841461388445580"

GRUPOS = [
    {"id": "618454204921867", "nome": "Venda e Locação Mogi das Cruzes"},
    {"id": "vendalocacaomogidascruzes", "nome": "Venda e Locação MDC"},
    {"id": "negociosmogidascruzes", "nome": "Negócios MDC"},
]


def get_tokens():
    page_token = os.getenv("META_PAGE_TOKEN")
    user_token = os.getenv("META_USER_TOKEN")
    if not page_token:
        print("ERRO: META_PAGE_TOKEN não configurado.")
        print("  Adicione ao .env.local: META_PAGE_TOKEN=seu_token_da_pagina_ecf")
        sys.exit(1)
    return page_token, user_token


def converter_para_jpeg(caminho: str) -> str:
    """Converte PNG para JPEG — Meta Graph API rejeita PNG em muitos casos"""
    p = Path(caminho)
    if p.suffix.lower() in (".jpg", ".jpeg"):
        return caminho
    destino = str(p.with_suffix(".jpg"))
    try:
        from PIL import Image
        with Image.open(caminho) as img:
            img.convert("RGB").save(destino, "JPEG", quality=95)
        return destino
    except ImportError:
        # Pillow não instalado — tentar via Bash convert (ImageMagick)
        import subprocess
        result = subprocess.run(["convert", caminho, "-quality", "95", destino], capture_output=True)
        if result.returncode == 0:
            return destino
        # Se nada funcionar, usar o PNG mesmo (pode falhar na API)
        return caminho


def hospedar_imagem(caminho: str) -> str:
    """Converte para JPEG e hospeda em URL pública via catbox.moe"""
    caminho = converter_para_jpeg(caminho)
    nome = Path(caminho).name
    print(f"  Hospedando {nome}...", end=" ")
    with open(caminho, "rb") as f:
        resp = requests.post(
            "https://catbox.moe/user/api.php",
            data={"reqtype": "fileupload"},
            files={"fileToUpload": (nome, f, "image/jpeg")},
            timeout=60,
        )
    url = resp.text.strip()
    if not url.startswith("https://"):
        raise RuntimeError(f"Falha no upload para catbox.moe: {url}")
    print(f"OK → {url}")
    return url


def criar_container_slide(ig_id: str, token: str, image_url: str) -> str:
    resp = requests.post(f"{BASE_URL}/{ig_id}/media", data={
        "access_token": token,
        "image_url": image_url,
        "is_carousel_item": "true",
    }, timeout=60)
    data = resp.json()
    if "id" not in data:
        raise RuntimeError(f"Erro ao criar container de slide: {data}")
    return data["id"]


def criar_carrossel_ig(ig_id: str, token: str, media_ids: list, caption: str) -> str:
    resp = requests.post(f"{BASE_URL}/{ig_id}/media", data={
        "access_token": token,
        "media_type": "CAROUSEL",
        "children": ",".join(media_ids),
        "caption": caption,
    }, timeout=30)
    data = resp.json()
    if "id" not in data:
        raise RuntimeError(f"Erro ao criar carrossel IG: {data}")
    return data["id"]


def aguardar_container(container_id: str, token: str) -> bool:
    for i in range(12):
        resp = requests.get(f"{BASE_URL}/{container_id}",
            params={"fields": "status_code", "access_token": token}, timeout=15)
        status = resp.json().get("status_code", "")
        if status == "FINISHED":
            return True
        if status == "ERROR":
            raise RuntimeError(f"Container com erro: {resp.json()}")
        print(f"  Processando... {(i+1)*5}s")
        time.sleep(5)
    return False


def publicar_carrossel_ig(ig_id: str, token: str, carousel_id: str) -> str:
    resp = requests.post(f"{BASE_URL}/{ig_id}/media_publish", data={
        "access_token": token,
        "creation_id": carousel_id,
    }, timeout=30)
    data = resp.json()
    if "id" not in data:
        raise RuntimeError(f"Erro ao publicar carrossel IG: {data}")
    return data["id"]


def publicar_facebook(page_id: str, token: str, caption: str, image_url: str = None) -> str:
    body = {"access_token": token, "message": caption}
    if image_url:
        body["link"] = image_url
    resp = requests.post(f"{BASE_URL}/{page_id}/feed", data=body, timeout=30)
    data = resp.json()
    if "id" not in data:
        raise RuntimeError(f"Erro ao publicar no Facebook: {data}")
    return data["id"]


def publicar_grupos(user_token: str, caption: str, image_url: str = None) -> list:
    resultados = []
    for grupo in GRUPOS:
        try:
            body = {"access_token": user_token, "message": caption}
            if image_url:
                body["link"] = image_url
            resp = requests.post(f"{BASE_URL}/{grupo['id']}/feed", data=body, timeout=30)
            data = resp.json()
            if "id" in data:
                resultados.append({"nome": grupo["nome"], "status": "ok", "id": data["id"]})
                print(f"  ✅ {grupo['nome']}")
            else:
                resultados.append({"nome": grupo["nome"], "status": "erro", "erro": str(data)})
                print(f"  ❌ {grupo['nome']}: {data}")
        except Exception as e:
            resultados.append({"nome": grupo["nome"], "status": "erro", "erro": str(e)})
            print(f"  ❌ {grupo['nome']}: {e}")
    return resultados


def run(slides: list, caption: str, grupos: bool = False, dry_run: bool = False):
    page_token, user_token = get_tokens()

    if len(slides) < 2:
        print("ERRO: Mínimo 2 slides para carrossel.")
        sys.exit(1)
    if len(slides) > 10:
        print("ERRO: Máximo 10 slides por carrossel.")
        sys.exit(1)

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Publicando carrossel com {len(slides)} slides")
    print(f"Caption: {caption[:80]}...")

    if dry_run:
        print("\n[DRY RUN] Tudo configurado. Remova --dry-run para publicar de verdade.")
        return

    # 1. Hospedar slides
    print("\n1/4 Hospedando imagens em URL pública...")
    urls = [hospedar_imagem(s) for s in slides]
    primeira_url = urls[0]

    # 2. Publicar no Instagram como carrossel
    print("\n2/4 Criando carrossel no Instagram...")
    try:
        containers = []
        for i, url in enumerate(urls):
            print(f"  Container {i+1}/{len(urls)}...", end=" ")
            cid = criar_container_slide(IG_USER_ID, page_token, url)
            containers.append(cid)
            print(f"OK ({cid})")

        carousel_id = criar_carrossel_ig(IG_USER_ID, page_token, containers, caption)
        print(f"  Aguardando processamento...")
        if not aguardar_container(carousel_id, page_token):
            raise RuntimeError("Timeout no processamento do carrossel")

        ig_post_id = publicar_carrossel_ig(IG_USER_ID, page_token, carousel_id)
        print(f"  ✅ Instagram: {ig_post_id}")
    except Exception as e:
        print(f"  ❌ Instagram falhou: {e}")
        ig_post_id = None

    # 3. Publicar no Facebook Page
    print("\n3/4 Publicando na Página do Facebook...")
    try:
        fb_post_id = publicar_facebook(PAGE_ID, page_token, caption, primeira_url)
        print(f"  ✅ Facebook Page: {fb_post_id}")
    except Exception as e:
        print(f"  ❌ Facebook falhou: {e}")
        fb_post_id = None

    # 4. Publicar nos Grupos (opcional, precisa do User Token)
    grupos_resultados = []
    if grupos:
        if not user_token:
            print("\n4/4 Grupos: META_USER_TOKEN não configurado — pulando grupos")
        else:
            print("\n4/4 Publicando nos Grupos do Facebook...")
            grupos_resultados = publicar_grupos(user_token, caption, primeira_url)

    # Resultado final
    print("\n" + "="*50)
    print("RESULTADO FINAL")
    print("="*50)
    print(f"Instagram: {'✅ ' + ig_post_id if ig_post_id else '❌ falhou'}")
    print(f"Facebook:  {'✅ ' + fb_post_id if fb_post_id else '❌ falhou'}")
    if grupos_resultados:
        ok = sum(1 for g in grupos_resultados if g["status"] == "ok")
        print(f"Grupos:    {ok}/{len(grupos_resultados)} publicados")

    result = {
        "instagram": ig_post_id,
        "facebook": fb_post_id,
        "grupos": grupos_resultados,
        "urls_hospedadas": urls,
    }
    Path("publicacao_resultado.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print("\nResultado salvo em publicacao_resultado.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Publica carrossel no Instagram + Facebook")
    parser.add_argument("--slides", nargs="+", required=True, help="Caminhos dos slides PNG (mínimo 2)")
    parser.add_argument("--caption", required=True, help="Legenda do post")
    parser.add_argument("--grupos", action="store_true", help="Também publicar nos Grupos do Facebook")
    parser.add_argument("--dry-run", action="store_true", help="Simula sem publicar de verdade")
    args = parser.parse_args()
    run(args.slides, args.caption, args.grupos, args.dry_run)
