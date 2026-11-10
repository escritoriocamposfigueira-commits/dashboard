"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { carregarCatalogo } = require("./biblioteca-trilhas");

const RAIZ = path.resolve(__dirname, "..");
const TMP = path.join(RAIZ, ".tmp-tour-etapa2");
const SAIDA = path.join(RAIZ, "public", "videos-tour-amostras");
const MANIFESTO = path.join(SAIDA, "manifesto.json");
const BASE = path.join(RAIZ, "src", "content", "base-imoveis-site.json");
const ARTE = (codigo) => path.join(RAIZ, "public", "anuncios", `${codigo.replace("CF-", "CF - ")}.png`);
const OURO = "0xD9AA4A";
const FONTE_SEM_SERIFA = "C\\:/Windows/Fonts/arialbd.ttf";
const FONTE_SERIFA = "C\\:/Windows/Fonts/georgiab.ttf";
const SOBREPOSICAO = 0.25;

const PLANOS = {
  "CF-620": {
    finalidade: "locacao",
    preco: "R$ 2.600/mês",
    local: "Mogi Moderno • Mogi das Cruzes",
    condicao: "Condomínio com lazer completo",
    cta: "COMENTE ALUGAR",
    trilhaIndice: 8,
    versoes: {
      A: {
        gancho: "Condomínio com piscina\npor R$ 2.600 em Mogi?",
        fotos: [29, 31, 1, 5, 10, 7, 13, 28],
        rotulos: ["Piscina do condomínio", "Condomínio fechado", "Garagem coberta", "Sala confortável", "Cozinha prática", "03 dormitórios", "Área gourmet com churrasqueira", "Salão de festas equipado"],
      },
      B: {
        gancho: "3 dormitórios + lazer completo\npor R$ 2.600/mês",
        fotos: [28, 31, 30, 6, 11, 9, 14, 27],
        rotulos: ["Salão de festas equipado", "Condomínio fechado", "Piscinas adulto e infantil", "Ambientes bem distribuídos", "Cozinha prática", "03 dormitórios", "Área gourmet com churrasqueira", "Espaços de convivência"],
      },
    },
  },
  "CF-609": {
    finalidade: "locacao",
    preco: "R$ 2.000/mês",
    local: "Vila Oliveira • Mogi das Cruzes",
    condicao: "Sala comercial reformada • 15 m²",
    cta: "COMENTE ALUGAR",
    trilhaIndice: 7,
    panoramas: [5, 6],
    versoes: {
      A: {
        gancho: "Sala reformada na Vila Oliveira\npor R$ 2 mil",
        fotos: [1, 3, 4, 5, 2, 6],
        rotulos: ["Sala comercial reformada", "Ambiente moderno", "Pronta para seu negócio", "Visão 360° da sala", "Banheiro privativo", "Visão 360° do banheiro"],
      },
      B: {
        gancho: "Seu negócio em 15 m²\nprontos para trabalhar",
        fotos: [5, 4, 1, 3, 6, 2],
        rotulos: ["Visão 360° da sala", "Ótima iluminação natural", "Sala totalmente reformada", "Ambiente profissional", "Visão 360° do banheiro", "Banheiro privativo"],
      },
    },
  },
  "CF-493": {
    finalidade: "venda",
    preco: "R$ 550.000",
    local: "Jardim Ivete • Mogi das Cruzes",
    condicao: "Aceita financiamento bancário",
    cta: "COMENTE COMPRAR",
    trilhaIndice: 0,
    versoes: {
      A: {
        gancho: "Conforto e lazer para\nsua família no Jardim Ivete",
        fotos: [1, 3, 5, 6, 14, 15, 20, 25],
        rotulos: ["Sobrado no Jardim Ivete", "Garagem coberta para 02 carros", "Sala de estar", "Cozinha planejada", "03 dormitórios", "03 banheiros", "Espaço de lazer", "Churrasqueira"],
      },
      B: {
        gancho: "Sobrado completo: 3 dormitórios\npor R$ 550 mil",
        fotos: [25, 1, 2, 9, 12, 16, 20, 3],
        rotulos: ["Churrasqueira", "Sobrado no Jardim Ivete", "Sala de estar e jantar", "Cozinha funcional", "03 dormitórios", "03 banheiros", "Salão de festas", "Garagem coberta para 02 carros"],
      },
    },
  },
};

function executar(programa, args, { timeout = 180_000 } = {}) {
  const resultado = spawnSync(programa, args, {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
    timeout,
  });
  if (resultado.status !== 0) {
    const detalhe = resultado.stderr?.slice(-1800) || resultado.error?.message || "erro desconhecido";
    throw new Error(`${programa} falhou: ${detalhe}`);
  }
  return resultado;
}

function caminhoFiltro(arquivo) {
  return arquivo.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function escreverTexto(pasta, nome, texto) {
  const destino = path.join(pasta, nome);
  fs.writeFileSync(destino, texto, "utf8");
  return caminhoFiltro(destino);
}

function baseVisual(indice, panorama = false) {
  const movimentoX = indice % 2 === 0
    ? "iw/2-(iw/zoom/2)+(iw-iw/zoom)*0.08*sin(on/50)"
    : "iw/2-(iw/zoom/2)-(iw-iw/zoom)*0.08*sin(on/50)";
  const preparar = panorama
    ? "[0:v]v360=input=equirect:output=flat:w=1920:h=1080:h_fov=105:v_fov=75:yaw=0:pitch=0,eq=brightness=0.025:contrast=1.04:saturation=1.03[base]"
    : "[0:v]eq=brightness=0.025:contrast=1.04:saturation=1.03[base]";
  return [
    preparar,
    "[base]split=2[bgsrc][fgsrc]",
    "[bgsrc]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.19:saturation=0.68[bg]",
    "[fgsrc]scale=1020:1420:force_original_aspect_ratio=decrease[fg]",
    "[bg][fg]overlay=(W-w)/2:(H-h)/2+55[comp0]",
    `[comp0]drawbox=x=28:y=195:w=1024:h=1530:color=${OURO}@0.92:t=4[comp]`,
    `[comp]zoompan=z='min(zoom+0.00038,1.055)':x='${movimentoX}':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30`,
  ].join(";");
}

function gerarSegmentoFoto({ imagem, destino, duracao, rotulo, indice, panorama, pasta }) {
  const texto = escreverTexto(pasta, `rotulo-${String(indice).padStart(2, "0")}.txt`, rotulo);
  const filtro = [
    baseVisual(indice, panorama),
    "drawbox=x=0:y=0:w=1080:h=125:color=black@0.76:t=fill",
    `drawtext=fontfile='${FONTE_SERIFA}':text='CAMPOS FIGUEIRA':x=(w-text_w)/2:y=39:fontsize=44:fontcolor=${OURO}`,
    "drawbox=x=65:y=1450:w=950:h=175:color=black@0.82:t=fill",
    `drawbox=x=65:y=1450:w=950:h=175:color=${OURO}@0.95:t=4`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':textfile='${texto}':x=(w-text_w)/2:y=1502:fontsize=50:fontcolor=white`,
    "format=yuv420p",
  ].join(",");
  executar("ffmpeg", [
    "-y", "-loop", "1", "-framerate", "30", "-i", imagem,
    "-vf", filtro, "-t", duracao.toFixed(3),
    "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    destino,
  ]);
}

function gerarSegmentoGancho({ imagem, destino, duracao, gancho, panorama, pasta }) {
  const texto = escreverTexto(pasta, "gancho.txt", gancho);
  const filtro = [
    baseVisual(0, panorama),
    "drawbox=x=0:y=0:w=1080:h=1920:color=black@0.25:t=fill",
    "drawbox=x=55:y=235:w=970:h=400:color=black@0.82:t=fill",
    `drawbox=x=55:y=235:w=970:h=400:color=${OURO}@0.98:t=4`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':textfile='${texto}':x=max(70\\,(w-text_w)/2):y=315:fontsize=54:line_spacing=22:fontcolor=white:borderw=2:bordercolor=black:fix_bounds=1`,
    `drawtext=fontfile='${FONTE_SERIFA}':text='CAMPOS FIGUEIRA':x=(w-text_w)/2:y=105:fontsize=48:fontcolor=${OURO}`,
    "format=yuv420p",
  ].join(",");
  executar("ffmpeg", [
    "-y", "-loop", "1", "-framerate", "30", "-i", imagem,
    "-vf", filtro, "-t", duracao.toFixed(3),
    "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    destino,
  ]);
}

function gerarSegmentoOferta({ imagem, destino, duracao, plano, panorama, pasta }) {
  const preco = escreverTexto(pasta, "preco.txt", plano.preco);
  const local = escreverTexto(pasta, "local.txt", plano.local);
  const condicao = escreverTexto(pasta, "condicao.txt", plano.condicao);
  const filtro = [
    baseVisual(1, panorama),
    "drawbox=x=0:y=0:w=1080:h=1920:color=black@0.50:t=fill",
    "drawbox=x=65:y=420:w=950:h=810:color=black@0.84:t=fill",
    `drawbox=x=65:y=420:w=950:h=810:color=${OURO}@0.98:t=5`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':textfile='${preco}':x=(w-text_w)/2:y=535:fontsize=92:fontcolor=${OURO}`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':textfile='${local}':x=(w-text_w)/2:y=720:fontsize=44:fontcolor=white`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':textfile='${condicao}':x=(w-text_w)/2:y=865:fontsize=40:fontcolor=white`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':text='CF-${plano.codigo.replace("CF-", "")}':x=(w-text_w)/2:y=1040:fontsize=46:fontcolor=${OURO}`,
    "format=yuv420p",
  ].join(",");
  executar("ffmpeg", [
    "-y", "-loop", "1", "-framerate", "30", "-i", imagem,
    "-vf", filtro, "-t", duracao.toFixed(3),
    "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    destino,
  ]);
}

function gerarSegmentoFinal({ arte, destino, duracao, plano, pasta }) {
  const cta = escreverTexto(pasta, "cta.txt", plano.cta);
  const filtro = [
    "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
    "zoompan=z='min(zoom+0.00016,1.025)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30",
    "drawbox=x=50:y=1460:w=980:h=210:color=black@0.88:t=fill",
    `drawbox=x=50:y=1460:w=980:h=210:color=${OURO}@0.98:t=5`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':textfile='${cta}':x=(w-text_w)/2:y=1510:fontsize=62:fontcolor=${OURO}`,
    `drawtext=fontfile='${FONTE_SEM_SERIFA}':text='CRECI 043649-J':x=(w-text_w)/2:y=1600:fontsize=38:fontcolor=white`,
    "format=yuv420p",
  ].join(",");
  executar("ffmpeg", [
    "-y", "-loop", "1", "-framerate", "30", "-i", arte,
    "-vf", filtro, "-t", duracao.toFixed(3),
    "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
    destino,
  ]);
}

function juntarComTransicoes(segmentos, duracoes, trilha, destino) {
  const args = ["-y"];
  segmentos.forEach((segmento) => args.push("-i", segmento));
  args.push("-stream_loop", "-1", "-i", trilha);
  const filtros = [];
  let acumulado = duracoes[0];
  let anterior = "0:v";
  for (let i = 1; i < segmentos.length; i += 1) {
    const saida = `v${i}`;
    const offset = acumulado - SOBREPOSICAO;
    filtros.push(`[${anterior}][${i}:v]xfade=transition=fade:duration=${SOBREPOSICAO}:offset=${offset.toFixed(3)}[${saida}]`);
    anterior = saida;
    acumulado += duracoes[i] - SOBREPOSICAO;
  }
  const indiceAudio = segmentos.length;
  filtros.push(`[${indiceAudio}:a]atrim=0:${acumulado.toFixed(3)},asetpts=N/SR/TB,loudnorm=I=-24:TP=-5:LRA=5,volume=0.30,afade=t=in:st=0:d=0.7,afade=t=out:st=${(acumulado - 1.5).toFixed(3)}:d=1.5[a]`);
  args.push(
    "-filter_complex", filtros.join(";"),
    "-map", `[${anterior}]`, "-map", "[a]",
    "-t", acumulado.toFixed(3),
    "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "21",
    "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-movflags", "+faststart",
    destino,
  );
  executar("ffmpeg", args, { timeout: 600_000 });
  return acumulado;
}

function hashArquivo(arquivo) {
  return crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
}

function criarPrevia(video, destino, segundo = 1.3) {
  executar("ffmpeg", ["-y", "-ss", String(segundo), "-i", video, "-frames:v", "1", "-q:v", "2", destino]);
}

function main() {
  const base = JSON.parse(fs.readFileSync(BASE, "utf8"));
  const catalogo = carregarCatalogo();
  fs.mkdirSync(SAIDA, { recursive: true });
  const itens = [];
  for (const [codigo, planoOriginal] of Object.entries(PLANOS)) {
    const imovel = base.anuncios.find((item) => item.codigo === codigo);
    if (!imovel) throw new Error(`${codigo} não encontrado na fonte oficial`);
    const plano = { ...planoOriginal, codigo };
    const analise = JSON.parse(fs.readFileSync(path.join(TMP, codigo, "analise.json"), "utf8"));
    const porNumero = new Map(analise.itens.map((item) => [item.numero, item]));
    const trilha = catalogo.trilhas[plano.trilhaIndice];
    for (const [versao, roteiro] of Object.entries(plano.versoes)) {
      const pasta = path.join(TMP, "render", codigo, versao);
      fs.mkdirSync(pasta, { recursive: true });
      const fotos = roteiro.fotos.map((numero) => {
        const foto = porNumero.get(numero);
        if (!foto) throw new Error(`${codigo}: foto ${numero} ausente`);
        return foto;
      });
      if (new Set(fotos.map((foto) => foto.sha256)).size < 5) throw new Error(`${codigo}: menos de cinco fotos reais distintas`);
      const duracaoGancho = 2.4;
      const duracaoFoto = 18.4 / fotos.length;
      const duracaoOferta = 3.6;
      const duracaoFinal = 4.0;
      const segmentos = [];
      const duracoes = [];
      const ganchoPath = path.join(pasta, "00-gancho.mp4");
      gerarSegmentoGancho({
        imagem: fotos[0].arquivo,
        destino: ganchoPath,
        duracao: duracaoGancho,
        gancho: roteiro.gancho,
        panorama: plano.panoramas?.includes(fotos[0].numero),
        pasta,
      });
      segmentos.push(ganchoPath);
      duracoes.push(duracaoGancho);
      fotos.forEach((foto, indice) => {
        const destino = path.join(pasta, `${String(indice + 1).padStart(2, "0")}-foto.mp4`);
        gerarSegmentoFoto({
          imagem: foto.arquivo,
          destino,
          duracao: duracaoFoto,
          rotulo: roteiro.rotulos[indice],
          indice,
          panorama: plano.panoramas?.includes(foto.numero),
          pasta,
        });
        segmentos.push(destino);
        duracoes.push(duracaoFoto);
      });
      const ofertaPath = path.join(pasta, "90-oferta.mp4");
      gerarSegmentoOferta({
        imagem: fotos.at(-1).arquivo,
        destino: ofertaPath,
        duracao: duracaoOferta,
        plano,
        panorama: plano.panoramas?.includes(fotos.at(-1).numero),
        pasta,
      });
      segmentos.push(ofertaPath);
      duracoes.push(duracaoOferta);
      const finalPath = path.join(pasta, "99-final.mp4");
      gerarSegmentoFinal({ arte: ARTE(codigo), destino: finalPath, duracao: duracaoFinal, plano, pasta });
      segmentos.push(finalPath);
      duracoes.push(duracaoFinal);
      const nome = `${codigo}-TOUR-${versao}.mp4`;
      const output = path.join(SAIDA, nome);
      console.log(`Renderizando ${codigo} versão ${versao}...`);
      const duracao = juntarComTransicoes(segmentos, duracoes, trilha.caminho, output);
      const previa = path.join(SAIDA, `${codigo}-TOUR-${versao}-PREVIA.jpg`);
      criarPrevia(output, previa);
      const inicioArte = duracao - duracaoFinal;
      itens.push({
        codigo,
        finalidade: plano.finalidade,
        versao,
        video: path.relative(RAIZ, output).replace(/\\/g, "/"),
        previa: path.relative(RAIZ, previa).replace(/\\/g, "/"),
        duracao_segundos: Math.round(duracao * 1000) / 1000,
        resolucao: "1080x1920",
        fps: 30,
        gancho: roteiro.gancho.replace(/\n/g, " "),
        primeira_foto: fotos[0].url,
        fotos_usadas: fotos.map((foto, indice) => ({
          numero: foto.numero,
          url: foto.url,
          sha256: foto.sha256,
          rotulo: roteiro.rotulos[indice],
          panorama_360: Boolean(plano.panoramas?.includes(foto.numero)),
        })),
        preco: plano.preco,
        local: plano.local,
        condicao: plano.condicao,
        cta: plano.cta,
        creci: "043649-J",
        arte_final: path.relative(RAIZ, ARTE(codigo)).replace(/\\/g, "/"),
        arte_inicio_segundos: Math.round(inicioArte * 1000) / 1000,
        trilha: { id: trilha.id, titulo: trilha.titulo, licenca: trilha.licenca },
        sha256: hashArquivo(output),
        bytes: fs.statSync(output).size,
        origem: imovel.url,
        imagem_gerada_por_ia: false,
      });
    }
  }
  const manifesto = {
    versao: 1,
    gerado_em: new Date().toISOString(),
    etapa: 2,
    status: "amostras_para_aprovacao",
    politica: {
      somente_fotos_reais: true,
      video_generativo: false,
      movimento: "zoom e pan determinísticos com FFmpeg",
      area_segura: { topo_px: 120, rodape_px: 250 },
      publicacao_automatica: false,
    },
    total: itens.length,
    itens,
  };
  fs.writeFileSync(MANIFESTO, `${JSON.stringify(manifesto, null, 2)}\n`, "utf8");
  console.log(`Concluído: ${itens.length} amostras em ${SAIDA}`);
}

if (require.main === module) {
  try {
    main();
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  }
}

module.exports = { MANIFESTO, PLANOS, SAIDA };
