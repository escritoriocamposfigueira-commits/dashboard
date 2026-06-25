import { NextRequest } from "next/server";
import { agendarFacebook, agendarInstagram } from "@/lib/meta-api";
import calendar from "@/content/calendario-julho-2026.json";

const PAGE_ID = "512040582222121";
const IG_USER_ID = "17841461388445580";

type PostResult = {
  ref: string;
  imovel: string;
  data: string;
  hora: string;
  facebook: "ok" | "erro" | "skip";
  instagram: "ok" | "erro" | "skip";
  fbId?: string;
  igId?: string;
  erro?: string;
};

export async function POST(request: NextRequest) {
  const { token, imageUrls, posts } = await request.json();

  const envToken = process.env.META_PAGE_TOKEN;
  const accessToken = envToken || token;

  if (!accessToken) {
    return Response.json({ erro: "Token obrigatório" }, { status: 400 });
  }

  const urls: Record<string, string> = imageUrls ?? {};
  const results: PostResult[] = [];
  const postList = (posts && Array.isArray(posts) && posts.length > 0) ? posts : calendar.posts;

  for (const post of postList) {
    const dataHora = `${post.data}T${post.hora}:00-03:00`;
    const result: PostResult = {
      ref: post.ref,
      imovel: post.imovel,
      data: post.data,
      hora: post.hora,
      facebook: "skip",
      instagram: "skip",
    };

    // Facebook
    try {
      const id = await agendarFacebook(PAGE_ID, accessToken, post.caption, dataHora);
      result.facebook = "ok";
      result.fbId = id;
    } catch (e: unknown) {
      result.facebook = "erro";
      result.erro = e instanceof Error ? e.message : "Erro desconhecido";
    }

    // Instagram — só agenda se tiver URL da foto
    const imgUrl = urls[post.ref];
    if (imgUrl) {
      try {
        const igId = await agendarInstagram(IG_USER_ID, accessToken, imgUrl, post.caption, dataHora);
        result.instagram = "ok";
        result.igId = igId;
      } catch (e: unknown) {
        result.instagram = "erro";
        result.erro = e instanceof Error ? e.message : "Erro desconhecido";
      }
    }

    results.push(result);
  }

  const fbOk = results.filter((r) => r.facebook === "ok").length;
  const igOk = results.filter((r) => r.instagram === "ok").length;
  const erros = results.filter((r) => r.facebook === "erro").length;

  return Response.json({ results, fbOk, igOk, erros, total: results.length });
}
