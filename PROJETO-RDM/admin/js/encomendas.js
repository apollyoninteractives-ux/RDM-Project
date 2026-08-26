// Liga a seção "Encomendas finalizadas" do painel admin ao Firebase.
//
// - Ao clicar em "enviar": a imagem é redimensionada/comprimida no próprio
//   navegador e salva, junto com a descrição e a data, como um único
//   documento na coleção "encomendas" do Firestore.
//   (Não usa o Firebase Storage — só o Firestore, que é o mesmo serviço já
//   usado pelo formulário de Ajuda e Feedback. Isso evita depender de o
//   Storage estar provisionado/configurado no projeto do Firebase.)
// - A página pública (html/encomendas.html) lê essa mesma coleção pra
//   montar os cards do "Histórico de Encomendas".
// - Também preenche a "Listagem de Uploads" aqui do painel, com botão
//   de excluir.

import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const fileInput = document.getElementById("fileEncomenda");
const descricaoInput = document.getElementById("descricaoEncomenda");
const dataInput = document.getElementById("dataUploadEncomenda");
const btnEnviar = document.getElementById("btnEnviarEncomenda");
const statusSpan = fileInput?.closest(".admin-col-upload")?.querySelector(".upload-status");
const listaUploads = document.getElementById("listaUploads");
const uploadPreview = document.querySelector(".upload-preview");

const encomendasCollection = collection(db, "encomendas");

// Documentos do Firestore têm limite de ~1MB. Redimensionamos e comprimimos
// a imagem no navegador antes de salvar, pra caber com folga nesse limite.
const DIMENSAO_MAXIMA = 1280;
const TAMANHO_ALVO_BYTES = 700000;

function formatarData(valorISO) {
    if (!valorISO) return "Sem data";
    const [ano, mes, dia] = valorISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function converterImagemParaDataURL(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();

        leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));

        leitor.onload = () => {
            const img = new Image();

            img.onerror = () => reject(new Error("O arquivo selecionado não é uma imagem válida."));

            img.onload = () => {
                let { width, height } = img;

                if (width > DIMENSAO_MAXIMA || height > DIMENSAO_MAXIMA) {
                    if (width >= height) {
                        height = Math.round(height * (DIMENSAO_MAXIMA / width));
                        width = DIMENSAO_MAXIMA;
                    } else {
                        width = Math.round(width * (DIMENSAO_MAXIMA / height));
                        height = DIMENSAO_MAXIMA;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);

                let qualidade = 0.82;
                let dataUrl = canvas.toDataURL("image/jpeg", qualidade);

                while (dataUrl.length > TAMANHO_ALVO_BYTES && qualidade > 0.3) {
                    qualidade -= 0.12;
                    dataUrl = canvas.toDataURL("image/jpeg", qualidade);
                }

                if (dataUrl.length > 900000) {
                    reject(new Error("A imagem continua muito grande mesmo após a compressão. Tente uma foto menor."));
                    return;
                }

                resolve(dataUrl);
            };

            img.src = leitor.result;
        };

        leitor.readAsDataURL(arquivo);
    });
}

async function enviarEncomenda() {
    const arquivo = fileInput?.files?.[0];
    const descricao = descricaoInput?.value.trim();
    const data = dataInput?.value;

    if (!arquivo) {
        alert("Selecione uma imagem da encomenda.");
        return;
    }
    if (!descricao) {
        alert("Preencha a descrição da encomenda.");
        return;
    }
    if (!data) {
        alert("Selecione a data do upload.");
        return;
    }

    const textoOriginal = btnEnviar.textContent;
    btnEnviar.disabled = true;
    btnEnviar.textContent = "enviando...";

    try {
        const imagemUrl = await converterImagemParaDataURL(arquivo);

        await addDoc(encomendasCollection, {
            imagemUrl,
            descricao,
            data,
            criadoEm: serverTimestamp()
        });

        alert("Encomenda enviada com sucesso!");

        fileInput.value = "";
        descricaoInput.value = "";
        dataInput.value = "";
        if (statusSpan) {
            statusSpan.textContent = "Nenhum arquivo selecionado";
            statusSpan.classList.remove("upload-status-ok");
        }

        carregarListagem();

    } catch (erro) {
        console.error("Erro ao enviar encomenda:", erro);
        alert(`Erro ao enviar a encomenda: ${erro.message || "tente novamente."}`);
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = textoOriginal;
    }
}

async function excluirEncomenda(id) {
    if (!confirm("Excluir esta encomenda da listagem pública?")) return;

    try {
        await deleteDoc(doc(db, "encomendas", id));
        carregarListagem();
    } catch (erro) {
        console.error("Erro ao excluir encomenda:", erro);
        alert(`Erro ao excluir a encomenda: ${erro.message || "tente novamente."}`);
    }
}

async function carregarListagem() {
    if (!listaUploads) return;

    listaUploads.innerHTML = "";

    try {
        const snap = await getDocs(query(encomendasCollection, orderBy("criadoEm", "desc")));

        if (snap.empty) {
            return;
        }

        snap.forEach(docSnap => {
            const encomenda = docSnap.data();

            const li = document.createElement("li");
            li.innerHTML = `
                <span>${encomenda.descricao} — ${formatarData(encomenda.data)}</span>
                <button type="button" class="btn-admin btn-admin-sm">excluir</button>
            `;

            li.addEventListener("mouseenter", () => {
                if (uploadPreview) {
                    uploadPreview.innerHTML = `<img src="${encomenda.imagemUrl}" alt="${encomenda.descricao}" class="upload-preview-img">`;
                }
            });

            li.querySelector("button").addEventListener("click", () => {
                excluirEncomenda(docSnap.id);
            });

            listaUploads.appendChild(li);
        });
    } catch (erro) {
        console.error("Erro ao carregar listagem de encomendas:", erro);
    }
}

btnEnviar?.addEventListener("click", enviarEncomenda);

carregarListagem();
