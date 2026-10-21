import { auth } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


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
