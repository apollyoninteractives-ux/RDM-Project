// Liga o botão "Sair" ao logout real do Firebase (auth-guard.js).
// Usado por todas as páginas administrativas que têm o botão #btnLogout.
import { logoutAdmin } from "./auth-guard.js";

document.getElementById("btnLogout").addEventListener("click", (e) => {
    e.preventDefault();
    logoutAdmin();
});
