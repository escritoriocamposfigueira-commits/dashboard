import { NextRequest } from "next/server";
import { verificarToken } from "@/lib/meta-api";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) return Response.json({ valido: false, erro: "Token ausente" }, { status: 400 });
  const resultado = await verificarToken(token);
  return Response.json(resultado);
}
