const BASE = "https://graph.facebook.com/v22.0";

export async function verificarToken(token: string): Promise<{ valido: boolean; nome?: string }> {
  const res = await fetch(`${BASE}/me?access_token=${encodeURIComponent(token)}`);
  const data = await res.json();
  if (!res.ok || data.error) return { valido: false };
  return { valido: true, nome: data.name };
}

export async function agendarFacebook(
  pageId: string,
  token: string,
  caption: string,
  dataHora: string
): Promise<string> {
  const ts = Math.floor(new Date(dataHora).getTime() / 1000);
  const res = await fetch(`${BASE}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      scheduled_publish_time: ts,
      published: false,
      access_token: token,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Erro ao agendar no Facebook");
  return data.id as string;
}

export async function criarContainerInstagram(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const res = await fetch(`${BASE}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Erro ao criar container");
  return data.id as string;
}

export async function aguardarContainerPronto(
  containerId: string,
  token: string,
  tentativas = 10
): Promise<void> {
  for (let i = 0; i < tentativas; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(
      `${BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`Container com status: ${data.status_code}`);
    }
  }
  throw new Error("Timeout aguardando container ficar pronto");
}

export async function publicarInstagram(
  igUserId: string,
  token: string,
  containerId: string
): Promise<string> {
  const res = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Erro ao publicar no Instagram");
  return data.id as string;
}
