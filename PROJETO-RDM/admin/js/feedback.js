// Listagem de feedbacks/ajuda no painel admin.
//
// Lê a coleção "AjudaEFeedback" do Firestore — a mesma em que o
// formulário público (html/ajuda-e-feedback.html, via
// admin/js/formulario.js) grava quando alguém envia o formulário — e
// monta um item por envio, com botão de excluir.
//
// Só é possível chegar nesta página logado como admin (ver
// admin/js/auth-guard.js, carregado no <head> de feedback.html), então a
// listagem só aparece pra quem está autenticado.

import { db } from "./firebase.js";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const listaFeedbacks = document.getElementById("listaFeedbacks");

const feedbackCollection = collection(db, "AjudaEFeedback");

function formatarData(timestamp) {
    if (!timestamp?.toDate) return "";
    const data = timestamp.toDate();
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, "0");
    const min = String(data.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

async function excluirFeedback(id, li) {
    if (!confirm("Excluir este envio da lista?")) return;

    try {
        await deleteDoc(doc(db, "AjudaEFeedback", id));
        li.remove();
    } catch (erro) {
        console.error("Erro ao excluir feedback:", erro);
        alert(`Erro ao excluir: ${erro.message || "tente novamente."}`);
    }
}

function criarItem(id, item) {
    const li = document.createElement("li");

    const tipo = item.tipo || "Feedback";
    const nome = escaparHtml(item.nome) || "Anônimo";
    const telefone = escaparHtml(item.telefone);
    const mensagem = escaparHtml(item.descricao);
    const data = formatarData(item.data);

    li.innerHTML = `
        <div class="feedback-header">
            <span class="feedback-nome">
                ${nome}
                <span class="feedback-tipo feedback-tipo-${tipo === "Ajuda" ? "ajuda" : "feedback"}">${escaparHtml(tipo)}</span>
            </span>
            <span class="feedback-data">${data}</span>
        </div>
        <p class="feedback-mensagem">${mensagem}</p>
        ${telefone ? `<p class="feedback-telefone">Telefone: ${telefone}</p>` : ""}
        <button type="button" class="btn-admin btn-admin-sm">excluir</button>
    `;

    li.querySelector("button").addEventListener("click", () => excluirFeedback(id, li));

    return li;
}

async function carregarFeedbacks() {
    if (!listaFeedbacks) return;

    listaFeedbacks.innerHTML = "";

    try {
        const snap = await getDocs(query(feedbackCollection, orderBy("data", "desc")));

        snap.forEach(docSnap => {
            listaFeedbacks.appendChild(criarItem(docSnap.id, docSnap.data()));
        });
        // Se a lista continuar vazia aqui, o CSS (.feedback-list:empty)
        // já mostra "Nenhum feedback recebido ainda." sozinho.

    } catch (erro) {
        console.error("Erro ao carregar feedbacks:", erro);
        listaFeedbacks.innerHTML = `<li class="feedback-erro">Não foi possível carregar os feedbacks agora.</li>`;
    }
}

carregarFeedbacks();
