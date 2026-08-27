// Página pública "Estampas".
//
// Lê a coleção "estampas" do Firestore — a mesma em que o painel admin
// (admin/js/estampas.js) salva quando alguém faz upload em "Estampas" — e
// monta um card para cada uma. Ao clicar em um card, abre um modal onde a
// pessoa escolhe um produto (camiseta, caneca etc.), o material/tecido e o
// tamanho, e simula a estampa aplicada sobre uma FOTO BASE real do produto
// (ver /img/produtos e js/produtos-base.js) — a estampa é só colada por
// cima com <canvas>, sem nenhuma IA de geração de imagem envolvida. O
// cliente pode arrastar e redimensionar a estampa antes de gerar a prévia.

import { db } from "../admin/js/firebase.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { caminhoImagemBase, areaPadraoEstampa } from "./produtos-base.js";

/* ---------- Catálogo de produtos ---------- */
const CATALOGO_PRODUTOS = {
    "Camiseta": {
        materiais: ["Algodão", "Poliéster (Dry-fit)", "Malha PV"],
        tamanhos: ["PP", "P", "M", "G", "GG", "XG"],
        cores: ["Branco", "Preto", "Cinza", "Vermelho", "Azul marinho", "Verde"]
    },
    "Moletom": {
        materiais: ["Moletom flanelado", "Moletom peluciado", "Algodão"],
        tamanhos: ["P", "M", "G", "GG", "XG"],
        cores: ["Branco", "Preto", "Cinza mescla", "Vermelho", "Azul marinho"]
    },
    "Caneca": {
        materiais: ["Cerâmica branca", "Cerâmica mágica (muda de cor)", "Inox"],
        tamanhos: ["Única (325ml)"],
        cores: ["Branco", "Preto", "Vermelho", "Azul"]
    },
    "Boné": {
        materiais: ["Sarja", "Brim", "Tactel"],
        tamanhos: ["Único (ajustável)"],
        cores: ["Branco", "Preto", "Vermelho", "Azul marinho", "Bege"]
    },
    "Almofada": {
        materiais: ["Oxford", "Veludo"],
        tamanhos: ["40x40cm", "50x50cm"],
        cores: ["Branco", "Preto", "Cinza", "Bege", "Vermelho"]
    }
};

/* Mapa de nome de cor para valor CSS — usado pra pintar a bolinha de
   seleção e também o placeholder desenhado quando falta a foto real. */
const MAPA_COR_CSS = {
    "Branco": "#ffffff",
    "Preto": "#1a1a1a",
    "Cinza": "#9c9c9c",
    "Cinza mescla": "#b3b3b3",
    "Vermelho": "#d91c23",
    "Azul": "#2f6fd9",
    "Azul marinho": "#1b2a4a",
    "Verde": "#2f8f4e",
    "Bege": "#d8c6a8"
};

const CORES_CLARAS = new Set(["Branco", "Bege", "Cinza mescla"]);

const grid = document.getElementById("estampasGrid");
const estado = document.getElementById("estampasEstado");

const modalEl = document.getElementById("modalEstampa");
const modalImg = document.getElementById("modalEstampaImg");
const modalData = document.getElementById("modalEstampaData");
const modalDescricao = document.getElementById("modalEstampaDescricao");
let modalBootstrap = null;

const selectProduto = document.getElementById("selectProduto");
const selectMaterial = document.getElementById("selectMaterial");
const selectTamanho = document.getElementById("selectTamanho");
const coresGrid = document.getElementById("coresGrid");
const corSelecionadaTexto = document.getElementById("corSelecionadaTexto");

const editorWrap = document.getElementById("editorWrap");
const editorCanvas = document.getElementById("editorCanvas");
const editorAviso = document.getElementById("editorAviso");
const btnGerarPreview = document.getElementById("btnGerarPreview");
const btnEditarNovamente = document.getElementById("btnEditarNovamente");

const previewErro = document.getElementById("previewErro");
const previewResultado = document.getElementById("previewResultado");
const previewImg = document.getElementById("previewImg");
const btnBaixarPreview = document.getElementById("btnBaixarPreview");

const ctx = editorCanvas.getContext("2d");

let estampaAtual = null;
let corAtual = null;

// Estado do editor: imagem base carregada, imagem da estampa carregada,
// e a caixa (em pixels do canvas) onde a estampa é desenhada.
let imgBase = null;
let imgEstampa = null;
let baseCarregouComSucesso = false;
let caixa = { x: 0, y: 0, w: 0, h: 0 };

const TAMANHO_MIN_CAIXA = 24;
const ALCA_TAMANHO = 14; // alça de redimensionar, em px do canvas

function formatarData(valorISO) {
    if (!valorISO) return "";
    const [ano, mes, dia] = valorISO.split("-");
    if (!ano || !mes || !dia) return valorISO;
    return `${dia}/${mes}/${ano}`;
}

/* ---------- Selects do simulador ---------- */

function preencherSelect(select, opcoes) {
    select.innerHTML = opcoes.map(opcao => `<option value="${opcao}">${opcao}</option>`).join("");
}

function renderizarCores(cores) {
    corAtual = cores[0];
    coresGrid.innerHTML = cores.map(cor => {
        const corCss = MAPA_COR_CSS[cor] || "#cccccc";
        const clara = CORES_CLARAS.has(cor) ? "true" : "false";
        const ativa = cor === corAtual ? "ativa" : "";
        return `
            <button type="button"
                class="swatch-cor ${ativa}"
                style="background:${corCss}"
                data-cor="${cor}"
                data-clara="${clara}"
                role="radio"
                aria-checked="${cor === corAtual}"
                aria-label="${cor}"
                title="${cor}"></button>
        `;
    }).join("");
    corSelecionadaTexto.textContent = corAtual;
}

coresGrid.addEventListener("click", (e) => {
    const swatch = e.target.closest(".swatch-cor");
    if (!swatch) return;

    corAtual = swatch.dataset.cor;
    corSelecionadaTexto.textContent = corAtual;

    coresGrid.querySelectorAll(".swatch-cor").forEach(el => {
        const ativo = el === swatch;
        el.classList.toggle("ativa", ativo);
        el.setAttribute("aria-checked", String(ativo));
    });

    carregarBaseEEstampa();
});

function atualizarSelectsPorProduto() {
    const produto = CATALOGO_PRODUTOS[selectProduto.value];
    if (!produto) return;
    preencherSelect(selectMaterial, produto.materiais);
    preencherSelect(selectTamanho, produto.tamanhos);
    renderizarCores(produto.cores);
}

function inicializarSelects() {
    preencherSelect(selectProduto, Object.keys(CATALOGO_PRODUTOS));
    atualizarSelectsPorProduto();
}

selectProduto.addEventListener("change", () => {
    atualizarSelectsPorProduto();
    carregarBaseEEstampa();
});

/* ---------- Estados da área de prévia ---------- */

function mostrarEditor() {
    editorWrap.classList.remove("d-none");
    previewErro.classList.add("d-none");
    previewResultado.classList.add("d-none");
    btnGerarPreview.classList.remove("d-none");
}

function mostrarPreviewErro() {
    editorWrap.classList.add("d-none");
    previewErro.classList.remove("d-none");
    previewResultado.classList.add("d-none");
}

function mostrarPreviewResultado(url) {
    previewImg.src = url;
    btnBaixarPreview.href = url;
    editorWrap.classList.add("d-none");
    previewErro.classList.add("d-none");
    previewResultado.classList.remove("d-none");
}

/* ---------- Carregamento de imagens ---------- */

function carregarImagem(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Falha ao carregar imagem: " + url));
        img.src = url;
    });
}

// Desenha um placeholder simples (retângulo + texto) no lugar da foto real
// do produto, pra quando o arquivo em /img/produtos ainda não existe.
function criarPlaceholderBase(produto, cor, largura, altura) {
    const canvasAux = document.createElement("canvas");
    canvasAux.width = largura;
    canvasAux.height = altura;
    const c = canvasAux.getContext("2d");

    const corCss = MAPA_COR_CSS[cor] || "#cccccc";
    const clara = CORES_CLARAS.has(cor);

    c.fillStyle = corCss;
    c.fillRect(0, 0, largura, altura);

    c.strokeStyle = clara ? "#00000030" : "#ffffff40";
    c.lineWidth = 6;
    c.setLineDash([14, 10]);
    c.strokeRect(8, 8, largura - 16, altura - 16);

    c.fillStyle = clara ? "#00000080" : "#ffffffb0";
    c.textAlign = "center";
    c.font = "bold 22px Inter, sans-serif";
    c.fillText(`${produto} ${cor}`, largura / 2, altura / 2 - 10);
    c.font = "14px Inter, sans-serif";
    c.fillText("foto base não cadastrada ainda", largura / 2, altura / 2 + 16);

    const img = new Image();
    img.src = canvasAux.toDataURL();
    return new Promise(resolve => { img.onload = () => resolve(img); });
}

/* ---------- Editor: desenho, arrastar e redimensionar ---------- */

function definirCaixaPadrao(produto) {
    const area = areaPadraoEstampa(produto);
    caixa = {
        x: area.xPct * editorCanvas.width,
        y: area.yPct * editorCanvas.height,
        w: area.wPct * editorCanvas.width,
        h: area.hPct * editorCanvas.height
    };
}

function desenharEditor() {
    ctx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    if (!imgBase) return;

    ctx.drawImage(imgBase, 0, 0, editorCanvas.width, editorCanvas.height);

    if (imgEstampa) {
        ctx.drawImage(imgEstampa, caixa.x, caixa.y, caixa.w, caixa.h);

        // Contorno da caixa (só no modo edição)
        ctx.strokeStyle = "#d91c23";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(caixa.x, caixa.y, caixa.w, caixa.h);
        ctx.setLineDash([]);

        // Alça de redimensionar no canto inferior direito
        ctx.fillStyle = "#d91c23";
        ctx.fillRect(
            caixa.x + caixa.w - ALCA_TAMANHO / 2,
            caixa.y + caixa.h - ALCA_TAMANHO / 2,
            ALCA_TAMANHO,
            ALCA_TAMANHO
        );
    }
}

function posicaoNoCanvas(evento) {
    const rect = editorCanvas.getBoundingClientRect();
    const ponto = evento.touches ? evento.touches[0] : evento;
    const escalaX = editorCanvas.width / rect.width;
    const escalaY = editorCanvas.height / rect.height;
    return {
        x: (ponto.clientX - rect.left) * escalaX,
        y: (ponto.clientY - rect.top) * escalaY
    };
}

function dentroDaAlca(pos) {
    return (
        pos.x >= caixa.x + caixa.w - ALCA_TAMANHO &&
        pos.x <= caixa.x + caixa.w + ALCA_TAMANHO &&
        pos.y >= caixa.y + caixa.h - ALCA_TAMANHO &&
        pos.y <= caixa.y + caixa.h + ALCA_TAMANHO
    );
}

function dentroDaCaixa(pos) {
    return pos.x >= caixa.x && pos.x <= caixa.x + caixa.w &&
        pos.y >= caixa.y && pos.y <= caixa.y + caixa.h;
}

let modoInteracao = null; // "mover" | "redimensionar" | null
let offsetArraste = { x: 0, y: 0 };

function iniciarInteracao(evento) {
    if (!imgEstampa) return;
    const pos = posicaoNoCanvas(evento);

    if (dentroDaAlca(pos)) {
        modoInteracao = "redimensionar";
    } else if (dentroDaCaixa(pos)) {
        modoInteracao = "mover";
        offsetArraste = { x: pos.x - caixa.x, y: pos.y - caixa.y };
    }

    if (modoInteracao) evento.preventDefault();
}

function moverInteracao(evento) {
    if (!modoInteracao) return;
    const pos = posicaoNoCanvas(evento);

    if (modoInteracao === "mover") {
        caixa.x = Math.min(Math.max(pos.x - offsetArraste.x, 0), editorCanvas.width - caixa.w);
        caixa.y = Math.min(Math.max(pos.y - offsetArraste.y, 0), editorCanvas.height - caixa.h);
    } else if (modoInteracao === "redimensionar") {
        caixa.w = Math.min(Math.max(pos.x - caixa.x, TAMANHO_MIN_CAIXA), editorCanvas.width - caixa.x);
        caixa.h = Math.min(Math.max(pos.y - caixa.y, TAMANHO_MIN_CAIXA), editorCanvas.height - caixa.y);
    }

    desenharEditor();
    evento.preventDefault();
}

function finalizarInteracao() {
    modoInteracao = null;
}

editorCanvas.addEventListener("mousedown", iniciarInteracao);
editorCanvas.addEventListener("mousemove", moverInteracao);
window.addEventListener("mouseup", finalizarInteracao);

editorCanvas.addEventListener("touchstart", iniciarInteracao, { passive: false });
editorCanvas.addEventListener("touchmove", moverInteracao, { passive: false });
window.addEventListener("touchend", finalizarInteracao);

/* ---------- Carregar base + estampa no editor ---------- */

async function carregarBaseEEstampa() {
    if (!estampaAtual) return;

    const produto = selectProduto.value;
    const cor = corAtual;

    // Tamanho fixo do canvas de edição (a exportação final usa essa
    // mesma resolução — suba esses valores se quiser mais qualidade).
    editorCanvas.width = 640;
    editorCanvas.height = 640;

    mostrarEditor();
    editorAviso.textContent = "Carregando...";

    baseCarregouComSucesso = true;
    try {
        imgBase = await carregarImagem(caminhoImagemBase(produto, cor));
    } catch (_e) {
        baseCarregouComSucesso = false;
        imgBase = await criarPlaceholderBase(produto, cor, editorCanvas.width, editorCanvas.height);
    }

    try {
        imgEstampa = await carregarImagem(estampaAtual.imagemUrl);
    } catch (_e) {
        imgEstampa = null;
    }

    definirCaixaPadrao(produto);
    desenharEditor();

    editorAviso.textContent = baseCarregouComSucesso
        ? "Arraste a estampa para posicionar e use o quadrado no canto para redimensionar."
        : "Foto real do produto ainda não cadastrada — adicione o arquivo em /img/produtos/. Usando um placeholder por enquanto.";
}

/* ---------- Gerar prévia final (composição, sem IA) ---------- */

function gerarPreview() {
    if (!imgBase) {
        mostrarPreviewErro();
        return;
    }

    // Redesenha numa cópia limpa (sem contorno/alça) pra exportar.
    const canvasFinal = document.createElement("canvas");
    canvasFinal.width = editorCanvas.width;
    canvasFinal.height = editorCanvas.height;
    const c = canvasFinal.getContext("2d");

    c.drawImage(imgBase, 0, 0, canvasFinal.width, canvasFinal.height);
    if (imgEstampa) {
        c.drawImage(imgEstampa, caixa.x, caixa.y, caixa.w, caixa.h);
    }

    mostrarPreviewResultado(canvasFinal.toDataURL("image/png"));
}

btnGerarPreview.addEventListener("click", gerarPreview);
btnEditarNovamente.addEventListener("click", mostrarEditor);

/* ---------- Modal ---------- */

function abrirModal(estampa) {
    estampaAtual = estampa;

    modalImg.src = estampa.imagemUrl;
    modalImg.alt = estampa.descricao;
    modalDescricao.textContent = estampa.descricao;
    modalData.textContent = formatarData(estampa.data);

    inicializarSelects();
    carregarBaseEEstampa();

    if (!modalBootstrap) {
        modalBootstrap = new bootstrap.Modal(modalEl);
    }
    modalBootstrap.show();
}

modalEl.addEventListener("hidden.bs.modal", () => {
    imgBase = null;
    imgEstampa = null;
});

/* ---------- Galeria ---------- */

function criarCard(estampa) {
    const col = document.createElement("div");
    col.className = "col-md-4 col-sm-6";

    col.innerHTML = `
        <div class="card-estampa card-estampa-click" role="button" tabindex="0">
            <div class="card-estampa-img-wrap">
                <img src="${estampa.imagemUrl}" alt="${estampa.descricao}" loading="lazy">
            </div>
            <p class="card-estampa-descricao">${estampa.descricao}</p>
            <span class="card-estampa-data">${formatarData(estampa.data)}</span>
            <span class="card-estampa-cta">Clique para simular em um produto →</span>
        </div>
    `;

    const card = col.querySelector(".card-estampa-click");
    card.addEventListener("click", () => abrirModal(estampa));
    card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrirModal(estampa);
        }
    });

    return col;
}

async function carregarEstampas() {
    try {
        const snap = await getDocs(query(collection(db, "estampas"), orderBy("criadoEm", "desc")));

        if (snap.empty) {
            estado.textContent = "Ainda não há estampas cadastradas para mostrar.";
            return;
        }

        estado.remove();

        snap.forEach(docSnap => {
            grid.appendChild(criarCard(docSnap.data()));
        });

    } catch (erro) {
        console.error("Erro ao carregar estampas:", erro);
        estado.textContent = "Não foi possível carregar as estampas no momento.";
    }
}

carregarEstampas();
