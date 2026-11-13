import json
import os
import sqlite3
import urllib.request

API = os.environ.get("CAPTADOR_API_URL", "").rstrip("/")
TOKEN = os.environ.get("CAPTADOR_INTERNAL_TOKEN", "")
DB = os.environ.get("CAPTADOR_RADAR_DB", r"D:\06 - ENGENHARIA\prospector\captacao.db")

if not API or not TOKEN:
    raise SystemExit("CAPTADOR_API_URL e CAPTADOR_INTERNAL_TOKEN são obrigatórios")


def enviar(itens):
    corpo = json.dumps({"itens": itens}, ensure_ascii=False).encode("utf-8")
    requisicao = urllib.request.Request(
        f"{API}/admin/radar",
        data=corpo,
        headers={"Content-Type": "application/json", "X-Internal-Token": TOKEN},
        method="POST",
    )
    with urllib.request.urlopen(requisicao, timeout=60) as resposta:
        return json.loads(resposta.read().decode("utf-8"))


conexao = sqlite3.connect(DB)
conexao.row_factory = sqlite3.Row
linhas = [dict(item) for item in conexao.execute("select * from leads order by score desc")]
total = 0
for inicio in range(0, len(linhas), 100):
    resultado = enviar(linhas[inicio:inicio + 100])
    total += int(resultado.get("importados", 0))

print(json.dumps({"ok": True, "importados": total}, ensure_ascii=False))
