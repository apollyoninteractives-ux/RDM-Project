import { logoutAdmin } from "./auth-guard.js";

document.getElementById("btnLogout").addEventListener("click", (e) => {
    e.preventDefault();
    logoutAdmin();
});
