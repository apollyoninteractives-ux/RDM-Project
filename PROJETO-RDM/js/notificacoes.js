// Caixas de mensagem no estilo do site RDM, no lugar do alert()/confirm()
// padrão do navegador. Não depende de HTML nem de CSS externos: os estilos
// são injetados pelo próprio módulo, então funciona no site e no painel admin.
//
//   import { avisar, confirmar } from "<caminho>/js/notificacoes.js";
//
//   avisar("Estampa enviada com sucesso!", { tipo: "sucesso" });
//   avisar("Preencha a descrição.", { tipo: "aviso" });         // "sucesso" | "erro" | "aviso"
//   if (await confirmar("Excluir esta estampa?")) { ... }        // true = confirmou

const ID_ESTILO = "rdm-notificacoes-estilo";

const TIPOS = {
    sucesso: { titulo: "Tudo certo!", cor: "#2f8f4e", icone: "M5 13l4 4L19 7" },
    erro: { titulo: "Ops, algo deu errado", cor: "#d91c23", icone: "M6 6l12 12M18 6L6 18" },
    aviso: { titulo: "Atenção", cor: "#e08a00", icone: "M12 7v6m0 4h.01" },
    pergunta: { titulo: "Tem certeza?", cor: "#d91c23", icone: "M9.5 9a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 4m0 3h.01" }
};

const CSS = `
.rdm-msg-fundo{position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(17,19,24,.62);backdrop-filter:blur(3px);opacity:0;transition:opacity .2s ease;
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif}
.rdm-msg-fundo.rdm-visivel{opacity:1}
.rdm-msg-caixa{position:relative;width:100%;max-width:400px;background:#fff;border-radius:20px;overflow:hidden;
  box-shadow:0 24px 60px rgba(17,19,24,.35);transform:translateY(14px) scale(.97);
  transition:transform .25s cubic-bezier(.4,0,.2,1);text-align:center}
.rdm-visivel .rdm-msg-caixa{transform:none}
.rdm-msg-topo{background:#111318;height:74px;border-bottom:4px solid #d91c23}
.rdm-msg-icone{width:64px;height:64px;border-radius:50%;background:#fff;margin:-36px auto 0;position:relative;
  display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(17,19,24,.18)}
.rdm-msg-icone svg{width:30px;height:30px;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.rdm-msg-corpo{padding:16px 28px 8px}
.rdm-msg-titulo{margin:0 0 8px;font-size:1.25rem;font-weight:700;color:#111318}
.rdm-msg-texto{margin:0;font-size:.98rem;line-height:1.5;color:#5a5c66;white-space:pre-line;word-break:break-word}
.rdm-msg-acoes{display:flex;gap:10px;justify-content:center;padding:20px 28px 26px}
.rdm-msg-btn{flex:1 1 0;max-width:170px;border-radius:14px;padding:12px 18px;font:inherit;font-weight:600;
  font-size:.95rem;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,background .2s ease,color .2s ease}
.rdm-msg-btn:focus-visible{outline:3px solid rgba(217,28,35,.35);outline-offset:2px}
.rdm-msg-btn-principal{background:#d91c23;color:#fff;border:2px solid #d91c23}
.rdm-msg-btn-principal:hover{background:#a8151b;border-color:#a8151b;transform:translateY(-2px);
  box-shadow:0 12px 24px rgba(217,28,35,.28)}
.rdm-msg-btn-secundario{background:#fff;color:#d91c23;border:2px solid #d91c23}
.rdm-msg-btn-secundario:hover{background:#d91c23;color:#fff;transform:translateY(-2px)}
@media (prefers-reduced-motion:reduce){.rdm-msg-fundo,.rdm-msg-caixa{transition:none}}
`;

function garantirEstilo() {
    if (document.getElementById(ID_ESTILO)) return;
    const style = document.createElement("style");
    style.id = ID_ESTILO;
    style.textContent = CSS;
    document.head.appendChild(style);
}

function criarElemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
}

// Fila: se várias mensagens forem pedidas ao mesmo tempo, aparecem uma por vez.
let fila = Promise.resolve();

function abrirCaixa({ tipo, titulo, mensagem, botoes }) {
    return new Promise((resolve) => {
        garantirEstilo();

        const config = TIPOS[tipo] || TIPOS.aviso;
        const focoAnterior = document.activeElement;

        const fundo = criarElemento("div", "rdm-msg-fundo");
        const caixa = criarElemento("div", "rdm-msg-caixa");
        caixa.setAttribute("role", tipo === "erro" ? "alertdialog" : "dialog");
        caixa.setAttribute("aria-modal", "true");

        const idTitulo = "rdm-msg-titulo-" + Date.now();
        caixa.setAttribute("aria-labelledby", idTitulo);

        caixa.appendChild(criarElemento("div", "rdm-msg-topo"));

        const icone = criarElemento("div", "rdm-msg-icone");
        icone.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" style="stroke:${config.cor}"><path d="${config.icone}"/></svg>`;
        caixa.appendChild(icone);

        const corpo = criarElemento("div", "rdm-msg-corpo");
        const h = criarElemento("h2", "rdm-msg-titulo", titulo || config.titulo);
        h.id = idTitulo;
        corpo.appendChild(h);
        corpo.appendChild(criarElemento("p", "rdm-msg-texto", String(mensagem ?? "")));
        caixa.appendChild(corpo);

        const acoes = criarElemento("div", "rdm-msg-acoes");
        let principal = null;

        function fechar(valor) {
            document.removeEventListener("keydown", aoTeclar, true);
            fundo.classList.remove("rdm-visivel");
            setTimeout(() => {
                fundo.remove();
                if (focoAnterior && typeof focoAnterior.focus === "function") focoAnterior.focus();
                resolve(valor);
            }, 180);
        }

        botoes.forEach((b) => {
            const btn = criarElemento("button", `rdm-msg-btn ${b.principal ? "rdm-msg-btn-principal" : "rdm-msg-btn-secundario"}`, b.texto);
            btn.type = "button";
            btn.addEventListener("click", () => fechar(b.valor));
            if (b.principal) principal = btn;
            acoes.appendChild(btn);
        });
        caixa.appendChild(acoes);
        fundo.appendChild(caixa);

        const valorCancelar = botoes.find((b) => !b.principal)?.valor ?? botoes[0].valor;

        function aoTeclar(e) {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                fechar(valorCancelar);
            } else if (e.key === "Tab") {
                // Mantém o foco dentro da caixa.
                const focaveis = acoes.querySelectorAll("button");
                const primeiro = focaveis[0];
                const ultimo = focaveis[focaveis.length - 1];
                if (e.shiftKey && document.activeElement === primeiro) {
                    e.preventDefault();
                    ultimo.focus();
                } else if (!e.shiftKey && document.activeElement === ultimo) {
                    e.preventDefault();
                    primeiro.focus();
                }
            }
        }
        document.addEventListener("keydown", aoTeclar, true);

        // Clicar fora da caixa só fecha os avisos simples (não as confirmações).
        fundo.addEventListener("mousedown", (e) => {
            if (e.target === fundo && botoes.length === 1) fechar(valorCancelar);
        });

        document.body.appendChild(fundo);
        requestAnimationFrame(() => {
            fundo.classList.add("rdm-visivel");
            principal?.focus();
        });
    });
}

export function avisar(mensagem, { tipo = "aviso", titulo } = {}) {
    const tarefa = fila.then(() => abrirCaixa({
        tipo,
        titulo,
        mensagem,
        botoes: [{ texto: "OK", valor: true, principal: true }]
    }));
    fila = tarefa.catch(() => { });
    return tarefa;
}

export function confirmar(mensagem, { titulo, confirmarTexto = "Confirmar", cancelarTexto = "Cancelar" } = {}) {
    const tarefa = fila.then(() => abrirCaixa({
        tipo: "pergunta",
        titulo,
        mensagem,
        botoes: [
            { texto: cancelarTexto, valor: false, principal: false },
            { texto: confirmarTexto, valor: true, principal: true }
        ]
    }));
    fila = tarefa.catch(() => { });
    return tarefa;
}
