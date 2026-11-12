// Monta o HTML das artes da semana. Cada <section data-arquivo> vira um PNG
// 1080x1350 em renderizar-semana.ts. Estilo em estilo.css.
import {
  diaDaSemanaCurto,
  diaDoMes,
  mesCurto,
  type Intervalo,
  type Streaming,
} from "@/dominio/marketing/semana";

export interface ArteDoTitulo {
  titulo: string;
  tituloCapa: string;
  data: string;
  detalhe: string;
  /** null = streaming ainda não confirmado. */
  streaming: Streaming | null;
  /** Caminhos relativos ao HTML; null quando o TMDb não tem a imagem. */
  poster: string | null;
  fundo: string | null;
  credito: string;
}

export interface DadosDasArtes {
  semana: Intervalo;
  numeroSemana: number;
  titulos: ArteDoTitulo[];
  quarta: { etiqueta: string; titulo: string; itens: string[] };
  sexta: { pergunta: string; opcoes: string[] };
}

function esc(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const LOGO = `<svg width="0" height="0" style="position:absolute"><symbol id="logo" viewBox="0 0 512 512">
<g transform="translate(256 256) scale(0.88) translate(-256 -256)">
<circle cx="256" cy="256" r="200" fill="none" stroke="#22D3EE" stroke-width="20" stroke-linecap="round" stroke-dasharray="1029.744 226.893" transform="rotate(168 256 256)"/>
<circle cx="256" cy="256" r="140" fill="none" stroke="#14B8A6" stroke-width="20" stroke-linecap="round" stroke-dasharray="720.821 158.825" transform="rotate(168 256 256)"/>
<circle cx="256" cy="256" r="80" fill="none" stroke="#64748B" stroke-width="20" stroke-linecap="round" stroke-dasharray="411.898 90.757" transform="rotate(168 256 256)"/>
<polygon points="211,171 211,341 356,256" fill="#22D3EE" stroke="#22D3EE" stroke-width="20" stroke-linejoin="round" transform="rotate(315 256 256)"/>
<circle cx="256" cy="256" r="18" fill="#64748B"/>
<line x1="256" y1="256" x2="114" y2="398" stroke="#22D3EE" stroke-width="20" stroke-linecap="round"/>
</g></symbol></svg>`;

const SETA = (cor: string, tamanho: number) =>
  `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

const marca = (texto = "ShowRadar") => `<div class="marca"><svg><use href="#logo"/></svg>${texto}</div>`;

function fundoRadar(posicao: string, tamanho: number) {
  const passo = tamanho / 8;
  return `<div class="aneis" style="width:${tamanho}px;height:${tamanho}px;${posicao}">
<i></i><i style="inset:${passo}px"></i><i style="inset:${passo * 2}px"></i><i style="inset:${passo * 3}px"></i>
<b class="blip" style="left:38%;top:88%;transform:scale(.55)"></b></div>`;
}

function pilula(s: Streaming | null) {
  return s
    ? `<span class="pilula" style="background:${s.cor}">${esc(s.nome)}</span>`
    : `<span class="pilula confirmar">A confirmar</span>`;
}

function intervaloGrande(semana: Intervalo) {
  const fim = mesCurto(semana.fim);
  const meses = mesCurto(semana.inicio) === fim ? fim : `${mesCurto(semana.inicio)}/${fim}`;
  return `<h1 class="num" data-ajustar="120"><span class="grad">${diaDoMes(semana.inicio)}—${diaDoMes(semana.fim)}</span><br>${meses}</h1>`;
}

function capa(d: DadosDasArtes) {
  const posters = d.titulos.map((t) => t.poster).filter((p): p is string => !!p);
  const mural = Array.from({ length: 6 }, (_, i) => posters[i % Math.max(posters.length, 1)])
    .filter(Boolean)
    .map((p) => `<img src="${p}">`)
    .join("");
  const itens = d.titulos
    .map(
      (t) => `<div class="item vidro"><div class="dia"><small>${diaDaSemanaCurto(t.data)}</small><strong>${diaDoMes(t.data)}</strong></div>
<div class="tit"><strong data-ajustar="20">${esc(t.tituloCapa)}</strong>
<span><i class="ponto" style="background:${t.streaming?.cor ?? "var(--apoio)"}"></i>${esc(t.streaming?.nome ?? "A confirmar")}</span></div></div>`,
    )
    .join("");
  return `<section class="slide grao capa" data-arquivo="carrossel-01-capa">
<div class="mural">${mural}</div><div class="vela"></div>
<div class="brilho ciano" style="width:800px;height:500px;left:140px;top:520px;opacity:.6"></div>
<div class="topo">${marca()}<span class="pilula mono veu">SEMANA ${d.numeroSemana}</span></div>
<div class="cab"><div class="kicker">No radar da semana</div>${intervaloGrande(d.semana)}</div>
<div class="grade">${itens}</div>
<div class="rodape"><span class="credito">Imagens: divulgação</span><span class="deslize vidro">Deslize ${SETA("#22D3EE", 26)}</span></div>
</section>`;
}

function slideDoTitulo(t: ArteDoTitulo, posicao: number, total: number) {
  const imagem = t.fundo ?? t.poster;
  const numero = String(posicao).padStart(2, "0");
  return `<section class="slide grao titulo" data-arquivo="carrossel-${numero}">
${imagem ? `<img class="fundo" src="${imagem}">` : fundoRadar("right:-640px;top:-640px", 1300)}
<div class="vela"></div>
<div class="topo"><span class="pilula mono veu" style="color:var(--ciano);letter-spacing:.14em">NO RADAR DA SEMANA</span>
<span class="pilula mono veu">${posicao}/${total}</span></div>
<div class="base">
<div class="quando"><small>${diaDaSemanaCurto(t.data)}</small><strong class="num grad">${diaDoMes(t.data)} ${mesCurto(t.data)}</strong></div>
<h2 data-ajustar="56">${esc(t.titulo)}</h2>
<div class="meta">${pilula(t.streaming)}<span class="tag">${esc(t.detalhe === "Filme" ? "Filme" : `Série · ${t.detalhe}`)}</span></div>
</div>
<div class="rodape">${marca("showradar.com.br")}${imagem ? `<span class="credito">${esc(t.credito)}</span>` : ""}</div>
</section>`;
}

const ICONES = {
  calendario: `<svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16l13-8z"/></svg>`,
  marcador: `<svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  escudo: `<svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
};

function slideFinal(posicao: number) {
  return `<section class="slide grao final" data-arquivo="carrossel-${String(posicao).padStart(2, "0")}-final">
<div class="brilho ciano" style="width:1000px;height:1000px;left:-420px;top:-420px"></div>
<div class="brilho teal" style="width:800px;height:800px;right:-380px;bottom:-200px"></div>
${fundoRadar("right:-760px;top:220px", 1500)}
<div class="centro"><svg class="icone"><use href="#logo"/></svg>
<h2>Todas as suas séries num só <span class="grad">radar.</span></h2>
<div class="recursos">
<div class="rec vidro">${ICONES.calendario}<b>Em breve</b><span>A data de cada episódio novo</span></div>
<div class="rec vidro">${ICONES.play}<b>Continuar assistindo</b><span>Saiba onde você parou</span></div>
<div class="rec vidro">${ICONES.marcador}<b>Quero assistir</b><span>Sua lista de séries e filmes</span></div>
<div class="rec vidro">${ICONES.escudo}<b>Sem anúncios</b><span>E com seus dados protegidos</span></div>
</div></div>
<div class="cta"><span class="botao">Cadastre-se grátis ${SETA("#04111A", 40)}</span><span class="site"><b>showradar.com.br</b>100% gratuito</span></div>
</section>`;
}

function quarta(d: DadosDasArtes) {
  const passos = d.quarta.itens
    .map((item, i) => `<div class="passo vidro"><b>${String(i + 1).padStart(2, "0")}</b><span data-ajustar="24">${esc(item)}</span></div>`)
    .join("");
  return `<section class="slide grao post" data-arquivo="quarta">
<div class="brilho ciano" style="width:900px;height:900px;right:-380px;top:-420px"></div>
<div class="brilho teal" style="width:700px;height:700px;left:-360px;bottom:-300px"></div>
${fundoRadar("right:-640px;top:-640px", 1300)}
<div class="topo">${marca()}</div>
<div class="conteudo"><div class="kicker">${esc(d.quarta.etiqueta)}</div>
<h2 data-ajustar="64">${esc(d.quarta.titulo)}</h2><div class="passos">${passos}</div></div>
<div class="cta"><span class="botao menor">Cadastre-se grátis ${SETA("#04111A", 30)}</span><span class="site"><b>showradar.com.br</b>100% gratuito</span></div>
</section>`;
}

function sexta(d: DadosDasArtes) {
  const opcoes = d.sexta.opcoes
    .map((o, i) => `<div class="opcao vidro"><span class="letra">${"ABCD"[i]}</span><span data-ajustar="28">${esc(o)}</span></div>`)
    .join("");
  return `<section class="slide grao post" data-arquivo="sexta">
<div class="brilho ciano" style="width:900px;height:900px;left:-420px;top:-420px"></div>
<div class="brilho teal" style="width:700px;height:700px;right:-360px;bottom:-300px"></div>
${fundoRadar("right:-760px;top:260px", 1500)}
<div class="topo">${marca()}<span class="pilula mono veu">ENQUETE</span></div>
<div class="conteudo"><div class="kicker">Sexta de séries</div>
<h2 data-ajustar="60">${esc(d.sexta.pergunta)}</h2><div class="passos">${opcoes}</div></div>
<div class="cta"><span class="chamada">Responda nos comentários ${SETA("#22D3EE", 32)}</span><span class="site"><b>showradar.com.br</b>100% gratuito</span></div>
</section>`;
}

// Reduz a fonte de cada [data-ajustar] até o texto caber (mínimo em px no
// atributo) e registra em window.avisos o que nem assim coube ou imagem que faltou.
const AJUSTE = `<script>
window.ajustar = () => {
  const avisos = [];
  // Folga vertical: com entrelinha menor que 1, as letras passam um pouco da caixa sem cortar o texto.
  const estoura = (el) => el.scrollWidth > el.clientWidth + 1 ||
    el.scrollHeight > el.clientHeight + parseFloat(getComputedStyle(el).fontSize) * 0.25;
  for (const el of document.querySelectorAll("[data-ajustar]")) {
    const minimo = Number(el.dataset.ajustar);
    let tamanho = parseFloat(getComputedStyle(el).fontSize);
    while (estoura(el) && tamanho > minimo) { tamanho -= 2; el.style.fontSize = tamanho + "px"; }
    if (estoura(el)) avisos.push(el.closest("section").dataset.arquivo + ": texto não coube: " + el.textContent.trim());
  }
  for (const img of document.querySelectorAll("img")) {
    if (!img.complete || img.naturalWidth === 0) avisos.push(img.closest("section").dataset.arquivo + ": imagem não carregou: " + img.getAttribute("src"));
  }
  return avisos;
};
</script>`;

export function montarHtml(d: DadosDasArtes, css: string): string {
  const total = d.titulos.length + 2;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@500;700&display=block" rel="stylesheet">
<style>${css}</style>${AJUSTE}</head><body>${LOGO}
${capa(d)}
${d.titulos.map((t, i) => slideDoTitulo(t, i + 2, total)).join("\n")}
${slideFinal(total)}
${quarta(d)}
${sexta(d)}
</body></html>`;
}
