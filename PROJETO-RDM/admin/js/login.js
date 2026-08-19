import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const submitBtn = loginForm.querySelector(".login-btn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value;

  loginError.classList.add("d-none");
  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, usuario, senha);
    // Login bem-sucedido -> redireciona para a página de upload
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Erro de login:", error.code);
    loginError.textContent = mensagemDeErro(error.code);
    loginError.classList.remove("d-none");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});

function mensagemDeErro(code) {
  switch (code) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Usuário ou senha inválidos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    default:
      return "Erro ao fazer login. Tente novamente.";
  }
}