import { db } from "./Firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const formulario = document.getElementById("AjudaEFeedback");

formulario.addEventListener("submit", async (e) => {

    e.preventDefault();

    const nome = document.getElementById("Nome").value;
    const descricao = document.getElementById("Descricao").value;
    const telefone = document.getElementById("Telefone").value;

    const tipo = document.querySelector('input[name="tipo"]:checked')?.value;

    try {

        await addDoc(collection(db, "AjudaEFeedback"), {

            nome: nome,
            tipo: tipo,
            descricao: descricao,
            telefone: telefone,
            data: serverTimestamp()

        });

        alert("Formulário enviado com sucesso!");

        formulario.reset();

    } catch (erro) {

        console.error("Erro:", erro);

        alert("Erro ao enviar o formulário.");

    }

});