import { db } from "../admin/js/firebase.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { caminhoImagemBase, areaPadraoEstampa } from "./produtos-base.js";
import { calcularPreco, formatarReais } from "./precos.js";

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
    }
};

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
const btnBaixarPdf = document.getElementById("btnBaixarPdf");
const precoValor = document.getElementById("precoValor");
const precoDetalhe = document.getElementById("precoDetalhe");

const ctx = editorCanvas.getContext("2d");

let estampaAtual = null;
let corAtual = null;
let previewUrlAtual = null;

let imgBase = null;
let imgEstampa = null;
let baseCarregouComSucesso = false;
let caixa = { x: 0, y: 0, w: 0, h: 0 };

const TAMANHO_MIN_CAIXA = 24;
const ALCA_TAMANHO = 14;

function formatarData(valorISO) {
    if (!valorISO) return "";
    const [ano, mes, dia] = valorISO.split("-");
    if (!ano || !mes || !dia) return valorISO;
    return `${dia}/${mes}/${ano}`;
}


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
    atualizarPreco();
}

function atualizarPreco() {
    const preco = calcularPreco(selectProduto.value, selectMaterial.value, selectTamanho.value);
    if (preco === null) {
        precoValor.textContent = "Sob consulta";
        precoDetalhe.textContent = "";
        return;
    }
    precoValor.textContent = formatarReais(preco);
    precoDetalhe.textContent = `${selectProduto.value} · ${selectMaterial.value} · ${selectTamanho.value}`;
}

selectMaterial.addEventListener("change", atualizarPreco);
selectTamanho.addEventListener("change", atualizarPreco);

function inicializarSelects() {
    preencherSelect(selectProduto, Object.keys(CATALOGO_PRODUTOS));
    atualizarSelectsPorProduto();
}

selectProduto.addEventListener("change", () => {
    atualizarSelectsPorProduto();
    carregarBaseEEstampa();
});


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
    previewUrlAtual = url;
    btnBaixarPreview.href = url;
    editorWrap.classList.add("d-none");
    previewErro.classList.add("d-none");
    previewResultado.classList.remove("d-none");
}


function carregarImagem(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Falha ao carregar imagem: " + url));
        img.src = url;
    });
}

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

        ctx.strokeStyle = "#d91c23";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(caixa.x, caixa.y, caixa.w, caixa.h);
        ctx.setLineDash([]);

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

let modoInteracao = null;
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


async function carregarBaseEEstampa() {
    if (!estampaAtual) return;

    const produto = selectProduto.value;
    const cor = corAtual;

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


function gerarPreview() {
    if (!imgBase) {
        mostrarPreviewErro();
        return;
    }

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


async function logoComoDataUrl() {
    try {
        const img = await carregarImagem("../img/Logo/Logo.png");
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        return { url: c.toDataURL("image/png"), w: c.width, h: c.height };
    } catch (_e) {
        return null;
    }
}

async function baixarPdf() {
    if (!previewUrlAtual) return;
    if (!window.jspdf) {
        alert("Não foi possível carregar o gerador de PDF. Verifique sua conexão e tente novamente.");
        return;
    }

    const textoOriginal = btnBaixarPdf.textContent;
    btnBaixarPdf.disabled = true;
    btnBaixarPdf.textContent = "Gerando PDF...";

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: "mm", format: "a4" });
        const largura = pdf.internal.pageSize.getWidth();
        const margem = 15;

        const produto = selectProduto.value;
        const material = selectMaterial.value;
        const tamanho = selectTamanho.value;
        const preco = calcularPreco(produto, material, tamanho);

        // Cabeçalho
        pdf.setFillColor(17, 17, 20);
        pdf.rect(0, 0, largura, 28, "F");
        pdf.setFillColor(217, 28, 35);
        pdf.rect(0, 28, largura, 2, "F");

        const logo = await logoComoDataUrl();
        let xTitulo = margem;
        if (logo) {
            const altLogo = 18;
            const largLogo = altLogo * (logo.w / logo.h);
            pdf.addImage(logo.url, "PNG", margem, 5, largLogo, altLogo);
            xTitulo = margem + largLogo + 6;
        }
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text("RDM Confecções", xTitulo, 14);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text("Ficha de simulação de estampa", xTitulo, 21);

        // Imagem da prévia
        const tamImg = 100;
        const xImg = (largura - tamImg) / 2;
        pdf.setDrawColor(220, 220, 224);
        pdf.rect(xImg - 1, 38 - 1, tamImg + 2, tamImg + 2);
        pdf.addImage(previewUrlAtual, "PNG", xImg, 38, tamImg, tamImg);

        // Especificações
        let y = 38 + tamImg + 14;
        pdf.setTextColor(17, 17, 20);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text("Especificações do produto", margem, y);
        pdf.setDrawColor(217, 28, 35);
        pdf.setLineWidth(0.6);
        pdf.line(margem, y + 2, margem + 60, y + 2);
        y += 10;

        const linhas = [
            ["Produto", produto],
            ["Material / Tecido", material],
            ["Tamanho", tamanho],
            ["Cor do produto", corAtual || "-"],
            ["Estampa", estampaAtual?.descricao || "-"],
            ["Data da estampa", formatarData(estampaAtual?.data) || "-"],
            ["Valor unitário estimado", preco === null ? "Sob consulta" : formatarReais(preco).replace(/\u00a0/g, " ")]
        ];

        pdf.setFontSize(11);
        linhas.forEach(([rotulo, valor], i) => {
            if (i % 2 === 0) {
                pdf.setFillColor(244, 244, 246);
                pdf.rect(margem, y - 5.5, largura - margem * 2, 8, "F");
            }
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(90, 90, 96);
            pdf.text(rotulo, margem + 3, y);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(17, 17, 20);
            pdf.text(String(valor), margem + 62, y);
            y += 8;
        });

        // Rodapé
        const hoje = new Date().toLocaleDateString("pt-BR");
        pdf.setFontSize(8.5);
        pdf.setTextColor(120, 120, 126);
        pdf.text("Prévia ilustrativa - o resultado real e o valor final podem variar. Solicite seu orçamento.", margem, 275);
        pdf.text("RDM Confecções · (15) 99698-0394 · rdm.confeccoes@hotmail.com", margem, 280);
        pdf.text(`Gerado em ${hoje}`, margem, 285);

        const nomeArquivo = `ficha-${produto}-${material}-${tamanho}`
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        pdf.save(`${nomeArquivo}.pdf`);
    } catch (erro) {
        console.error("Erro ao gerar PDF:", erro);
        alert("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
        btnBaixarPdf.disabled = false;
        btnBaixarPdf.textContent = textoOriginal;
    }
}

btnBaixarPdf.addEventListener("click", baixarPdf);
btnGerarPreview.addEventListener("click", gerarPreview);
btnEditarNovamente.addEventListener("click", mostrarEditor);


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
