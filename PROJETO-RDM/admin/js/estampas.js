// Liga a seção "Estampas" do painel admin ao Firebase.
//
// Segue exatamente o mesmo padrão de admin/js/encomendas.js:
// - A imagem é redimensionada/comprimida no navegador e salva, junto com a
//   descrição e a data, como um único documento na coleção "estampas" do
//   Firestore (sem depender do Firebase Storage).
// - A página pública (html/estampas.html) lê essa mesma coleção pra montar
//   a galeria de estampas e o modal de simulação com IA.
// - Também preenche a "Listagem de Estampas" aqui do painel, com botão de
//   excluir.

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

const fileInput = document.getElementById("fileEstampa");
const descricaoInput = document.getElementById("descricaoEstampa");
const dataInput = document.getElementById("dataUploadEstampa");
const btnEnviar = document.getElementById("btnEnviarEstampa");
const statusSpan = fileInput?.closest(".admin-col-upload")?.querySelector(".upload-status");
const listaEstampas = document.getElementById("listaEstampas");
const uploadPreview = document.getElementById("previewEstampas");

const estampasCollection = collection(db, "estampas");

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

async function enviarEstampa() {
    const arquivo = fileInput?.files?.[0];
    const descricao = descricaoInput?.value.trim();
    const data = dataInput?.value;

    if (!arquivo) {
        alert("Selecione uma imagem da estampa.");
        return;
    }
    if (!descricao) {
        alert("Preencha a descrição da estampa.");
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

        await addDoc(estampasCollection, {
            imagemUrl,
            descricao,
            data,
            criadoEm: serverTimestamp()
        });

        alert("Estampa enviada com sucesso!");

        fileInput.value = "";
        descricaoInput.value = "";
        dataInput.value = "";
        if (statusSpan) {
            statusSpan.textContent = "Nenhum arquivo selecionado";
            statusSpan.classList.remove("upload-status-ok");
        }

        carregarListagem();

    } catch (erro) {
        console.error("Erro ao enviar estampa:", erro);
        alert(`Erro ao enviar a estampa: ${erro.message || "tente novamente."}`);
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = textoOriginal;
    }
}

async function excluirEstampa(id) {
    if (!confirm("Excluir esta estampa da galeria pública?")) return;

    try {
        await deleteDoc(doc(db, "estampas", id));
        carregarListagem();
    } catch (erro) {
        console.error("Erro ao excluir estampa:", erro);
        alert(`Erro ao excluir a estampa: ${erro.message || "tente novamente."}`);
    }
}

async function carregarListagem() {
    if (!listaEstampas) return;

    listaEstampas.innerHTML = "";

    try {
        const snap = await getDocs(query(estampasCollection, orderBy("criadoEm", "desc")));

        if (snap.empty) {
            return;
        }

        snap.forEach(docSnap => {
            const estampa = docSnap.data();

            const li = document.createElement("li");
            li.innerHTML = `
                <span>${estampa.descricao} — ${formatarData(estampa.data)}</span>
                <button type="button" class="btn-admin btn-admin-sm">excluir</button>
            `;

            li.addEventListener("mouseenter", () => {
                if (uploadPreview) {
                    uploadPreview.innerHTML = `<img src="${estampa.imagemUrl}" alt="${estampa.descricao}" class="upload-preview-img">`;
                }
            });

            li.querySelector("button").addEventListener("click", () => {
                excluirEstampa(docSnap.id);
            });

            listaEstampas.appendChild(li);
        });
    } catch (erro) {
        console.error("Erro ao carregar listagem de estampas:", erro);
    }
}

btnEnviar?.addEventListener("click", enviarEstampa);

carregarListagem();
