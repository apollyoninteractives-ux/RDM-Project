// Página pública "Histórico de Encomendas": lê a coleção "encomendas" do
// Firestore (a mesma em que admin/js/encomendas.js salva) e monta um card
// por upload. Ao clicar em um card, abre um modal com imagem, descrição e data.

import { db } from "../admin/js/firebase.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const grid = document.getElementById("encomendasGrid");
const estado = document.getElementById("encomendasEstado");

const modalEl = document.getElementById("modalEncomenda");
const modalImg = document.getElementById("modalEncomendaImg");
const modalData = document.getElementById("modalEncomendaData");
const modalDescricao = document.getElementById("modalEncomendaDescricao");
let modalBootstrap = null;

function formatarData(valorISO) {
    if (!valorISO) return "";
    const [ano, mes, dia] = valorISO.split("-");
    if (!ano || !mes || !dia) return valorISO;
    return `${dia}/${mes}/${ano}`;
}

function abrirModal(encomenda) {
    modalImg.src = encomenda.imagemUrl;
    modalImg.alt = encomenda.descricao;
    modalDescricao.textContent = encomenda.descricao;
    modalData.textContent = formatarData(encomenda.data);

    if (!modalBootstrap) {
        modalBootstrap = new bootstrap.Modal(modalEl);
    }
    modalBootstrap.show();
}

function criarCard(encomenda) {
    const col = document.createElement("div");
    col.className = "col-md-4 col-sm-6";

    col.innerHTML = `
        <div class="card-encomenda card-encomenda-click" role="button" tabindex="0">
            <div class="card-encomenda-img-wrap">
                <img src="${encomenda.imagemUrl}" alt="${encomenda.descricao}" loading="lazy">
            </div>
            <p class="card-encomenda-descricao">${encomenda.descricao}</p>
            <span class="card-encomenda-data">${formatarData(encomenda.data)}</span>
        </div>
    `;

    const card = col.querySelector(".card-encomenda-click");
    card.addEventListener("click", () => abrirModal(encomenda));
    card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrirModal(encomenda);
        }
    });

    return col;
}

async function carregarEncomendas() {
    try {
        const snap = await getDocs(query(collection(db, "encomendas"), orderBy("criadoEm", "desc")));

        if (snap.empty) {
            estado.textContent = "Ainda não há encomendas finalizadas para mostrar.";
            return;
        }

        estado.remove();

        snap.forEach(docSnap => {
            grid.appendChild(criarCard(docSnap.data()));
        });

    } catch (erro) {
        console.error("Erro ao carregar encomendas:", erro);
        estado.textContent = "Não foi possível carregar as encomendas no momento.";
    }
}

carregarEncomendas();
