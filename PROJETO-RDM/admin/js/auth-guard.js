import { auth } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Protege as páginas admin: sem usuário autenticado no Firebase, redireciona
// para o login. As Security Rules do Firestore/Storage é que garantem a
// proteção real dos dados — isto aqui só evita mostrar a página no front-end.
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    document.documentElement.classList.add("auth-ok");
});

export function logoutAdmin() {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
}
