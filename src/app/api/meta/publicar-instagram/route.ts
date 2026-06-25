import { NextRequest } from "next/server";
import {
  criarContainerInstagram,
  aguardarContainerPronto,
  publicarInstagram,
} from "@/lib/meta-api";

const IG_USER_ID = "17841461388445580";

export async function POST(request: NextRequest) {
  const { token, ref, caption, imageUrl } = await request.json();

  const envToken = process.env.META_PAGE_TOKEN;
  const accessToken = envToken || token;

  if (!accessToken) return Response.json({ erro: "Token obrigatório" }, { status: 400 });
  if (!imageUrl) return Response.json({ erro: "URL da imagem obrigatória para Instagram" }, { status: 400 });
  if (!caption) return Response.json({ erro: "Caption obrigatório" }, { status: 400 });

  try {
    const containerId = await criarContainerInstagram(IG_USER_ID, accessToken, imageUrl, caption);
    await aguardarContainerPronto(containerId, accessToken);
    const postId = await publicarInstagram(IG_USER_ID, accessToken, containerId);
    return Response.json({ ref, status: "ok", id: postId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return Response.json({ ref, status: "erro", erro: msg }, { status: 500 });
  }
}
