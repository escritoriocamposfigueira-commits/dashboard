import { NextRequest } from "next/server";
import { agendarFacebook } from "@/lib/meta-api";
import calendar from "@/content/calendario-julho-2026.json";

const PAGE_ID = "512040582222121";

type PostResult = {
  ref: string;
  imovel: string;
  data: string;
  hora: string;
  status: "ok" | "erro";
  id?: string;
  erro?: string;
};

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  const envToken = process.env.META_PAGE_TOKEN;
  const accessToken = envToken || token;

  if (!accessToken) {
    return Response.json({ erro: "Token obrigatório" }, { status: 400 });
  }

  const results: PostResult[] = [];

  for (const post of calendar.posts) {
    const dataHora = `${post.data}T${post.hora}:00-03:00`;
    try {
      const id = await agendarFacebook(PAGE_ID, accessToken, post.caption, dataHora);
      results.push({ ref: post.ref, imovel: post.imovel, data: post.data, hora: post.hora, status: "ok", id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      results.push({ ref: post.ref, imovel: post.imovel, data: post.data, hora: post.hora, status: "erro", erro: msg });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const erros = results.filter((r) => r.status === "erro").length;
  return Response.json({ results, ok, erros, total: results.length });
}
