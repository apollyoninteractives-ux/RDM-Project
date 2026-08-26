// Página pública "Estampas".
//
// Lê a coleção "estampas" do Firestore — a mesma em que o painel admin
// (admin/js/estampas.js) salva quando alguém faz upload em "Estampas" — e
// monta um card para cada uma. Ao clicar em um card, abre um modal onde a
// pessoa escolhe um produto (camiseta, caneca etc.), o material/tecido e o
// tamanho, e pode gerar uma prévia de como a estampa ficaria nesse produto
// usando uma IA de geração de imagens gratuita (Pollinations AI), que não
// exige chave de API nem backend.

import { db } from "../admin/js/firebase.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ---------- Catálogo de produtos ----------
   Cada produto define seus materiais/tecidos e tamanhos disponíveis,
   usados para montar os selects do modal e o prompt enviado à IA. */
const CATALOGO_PRODUTOS = {
    "Camiseta": {
        materiais: ["Algodão", "Poliéster (Dry-fit)", "Malha PV"],
        tamanhos: ["PP", "P", "M", "G", "GG", "XG"]
    },
    "Moletom": {
        materiais: ["Moletom flanelado", "Moletom peluciado", "Algodão"],
        tamanhos: ["P", "M", "G", "GG", "XG"]
    },
    "Caneca": {
        materiais: ["Cerâmica branca", "Cerâmica mágica (muda de cor)", "Inox"],
        tamanhos: ["Única (325ml)"]
    },
    "Boné": {
        materiais: ["Sarja", "Brim", "Tactel"],
        tamanhos: ["Único (ajustável)"]
    },
    "Almofada": {
        materiais: ["Oxford", "Veludo"],
        tamanhos: ["40x40cm", "50x50cm"]
    }
};

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
const formSimulacao = document.getElementById("formSimulacao");
const btnGerarPreview = document.getElementById("btnGerarPreview");

const previewVazio = document.getElementById("previewVazio");
const previewCarregando = document.getElementById("previewCarregando");
const previewErro = document.getElementById("previewErro");
const previewResultado = document.getElementById("previewResultado");
const previewImg = document.getElementById("previewImg");

let estampaAtual = null;

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

function atualizarSelectsPorProduto() {
    const produto = CATALOGO_PRODUTOS[selectProduto.value];
    if (!produto) return;
    preencherSelect(selectMaterial, produto.materiais);
    preencherSelect(selectTamanho, produto.tamanhos);
}

function inicializarSelects() {
    preencherSelect(selectProduto, Object.keys(CATALOGO_PRODUTOS));
    atualizarSelectsPorProduto();
}

selectProduto.addEventListener("change", atualizarSelectsPorProduto);

/* ---------- Estado da área de prévia ---------- */

function mostrarPreviewVazio() {
    previewVazio.classList.remove("d-none");
    previewCarregando.classList.add("d-none");
    previewErro.classList.add("d-none");
    previewResultado.classList.add("d-none");
}

function mostrarPreviewCarregando() {
    previewVazio.classList.add("d-none");
    previewCarregando.classList.remove("d-none");
    previewErro.classList.add("d-none");
    previewResultado.classList.add("d-none");
}

function mostrarPreviewErro() {
    previewVazio.classList.add("d-none");
    previewCarregando.classList.add("d-none");
    previewErro.classList.remove("d-none");
    previewResultado.classList.add("d-none");
}

function mostrarPreviewResultado(url) {
    previewImg.src = url;
    previewVazio.classList.add("d-none");
    previewCarregando.classList.add("d-none");
    previewErro.classList.add("d-none");
    previewResultado.classList.remove("d-none");
}

/* ---------- Geração da prévia com IA (Pollinations, gratuita e sem chave) ---------- */

function montarPrompt(descricaoEstampa, produto, material, tamanho) {
    return [
        `mockup fotográfico profissional de e-commerce de um(a) ${produto.toLowerCase()}`,
        `na cor branca, confeccionado em ${material.toLowerCase()}, tamanho ${tamanho}`,
        `estampado com o seguinte design: ${descricaoEstampa}`,
        `still life, fundo neutro liso, iluminação de estúdio, foco nítido, alta qualidade, sem texto sobreposto`
    ].join(", ");
}

function gerarUrlImagemIA(prompt) {
    const semente = Math.floor(Math.random() * 1000000);
    const parametros = new URLSearchParams({
        width: "768",
        height: "768",
        nologo: "true",
        seed: String(semente)
    });
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${parametros.toString()}`;
}

function gerarPreview() {
    if (!estampaAtual) return;

    const produto = selectProduto.value;
    const material = selectMaterial.value;
    const tamanho = selectTamanho.value;
    const prompt = montarPrompt(estampaAtual.descricao, produto, material, tamanho);
    const url = gerarUrlImagemIA(prompt);

    mostrarPreviewCarregando();
    btnGerarPreview.disabled = true;
    btnGerarPreview.textContent = "Gerando...";

    const imagemTeste = new Image();

    imagemTeste.onload = () => {
        mostrarPreviewResultado(url);
        btnGerarPreview.disabled = false;
        btnGerarPreview.textContent = "Gerar prévia com IA";
    };

    imagemTeste.onerror = () => {
        mostrarPreviewErro();
        btnGerarPreview.disabled = false;
        btnGerarPreview.textContent = "Gerar prévia com IA";
    };

    imagemTeste.src = url;
}

formSimulacao.addEventListener("submit", (e) => {
    e.preventDefault();
    gerarPreview();
});

/* ---------- Modal ---------- */

function abrirModal(estampa) {
    estampaAtual = estampa;

    modalImg.src = estampa.imagemUrl;
    modalImg.alt = estampa.descricao;
    modalDescricao.textContent = estampa.descricao;
    modalData.textContent = formatarData(estampa.data);

    inicializarSelects();
    mostrarPreviewVazio();

    if (!modalBootstrap) {
        modalBootstrap = new bootstrap.Modal(modalEl);
    }
    modalBootstrap.show();
}

// Sempre que o modal fecha, zera a prévia pra não vazar o resultado de uma
// estampa pra outra quando a pessoa abrir um card diferente.
modalEl.addEventListener("hidden.bs.modal", () => {
    mostrarPreviewVazio();
    btnGerarPreview.disabled = false;
    btnGerarPreview.textContent = "Gerar prévia com IA";
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
