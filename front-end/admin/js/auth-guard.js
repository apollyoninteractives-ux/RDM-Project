import { auth } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

/*
  Proteção real de página administrativa.

  Como funciona:
  - onAuthStateChanged é o jeito correto do Firebase te avisar se existe
    (ou não) um usuário autenticado no momento — ele consulta o token de
    sessão do próprio Firebase, não algo que dá pra falsificar direto no
    navegador como um item do sessionStorage/localStorage.
  - Enquanto o Firebase ainda não respondeu, a página fica com
    visibility:hidden (ver auth-guard.css) pra ninguém ver o conteúdo
    admin piscando na tela antes do redirecionamento.
  - Se NÃO houver usuário logado, redireciona pro login.
  - Se houver, revela a página.

  IMPORTANTE: isso protege a EXPERIÊNCIA no front-end (esconder a página
  de quem não está logado). Mas se essa página busca dados sensíveis do
  Firestore/Storage, a proteção que realmente importa são as Security
  Rules do Firebase — sem elas configuradas corretamente, alguém pode
  ler os dados diretamente pela API, mesmo sem ver essa página.
*/

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    document.documentElement.classList.add("auth-ok");
});

// Chame logoutAdmin() no botão de sair de cada página admin.
export function logoutAdmin() {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
}
