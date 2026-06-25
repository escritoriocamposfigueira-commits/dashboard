import { NextRequest } from "next/server";
import { publicarGrupo } from "@/lib/meta-api";

// IDs numéricos dos grupos — vanity names não funcionam diretamente na API
// O terceiro já vem como ID numérico direto da URL
export const GRUPOS = [
  { id: "618454204921867", nome: "Venda e Locação Mogi das Cruzes" },
  // Os dois abaixo usam vanity name — precisam ser resolvidos com o token do usuário
  // ou substituídos pelo ID numérico após resolução
  { id: "vendalocacaomogidascruzes", nome: "Venda e Locação MDC (vanity)" },
  { id: "negociosmogidascruzes", nome: "Negócios MDC (vanity)" },
];

type GrupoResult = {
  grupoId: string;
  nome: string;
  status: "ok" | "erro";
  id?: string;
  erro?: string;
};

export async function POST(request: NextRequest) {
  const { userToken, message, imageUrl, ref } = await request.json();

  const envToken = process.env.META_USER_TOKEN;
  const accessToken = envToken || userToken;

  if (!accessToken) return Response.json({ erro: "User Token obrigatório" }, { status: 400 });
  if (!message) return Response.json({ erro: "Mensagem obrigatória" }, { status: 400 });

  const results: GrupoResult[] = [];

  for (const grupo of GRUPOS) {
    try {
      const postId = await publicarGrupo(grupo.id, accessToken, message, imageUrl);
      results.push({ grupoId: grupo.id, nome: grupo.nome, status: "ok", id: postId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      results.push({ grupoId: grupo.id, nome: grupo.nome, status: "erro", erro: msg });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  return Response.json({ ref, results, ok, total: results.length });
}
