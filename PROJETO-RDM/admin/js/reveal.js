// Anima os elementos ".reveal" conforme eles entram na tela (scroll).
// Usado por todas as páginas administrativas que têm seções ".reveal".
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
    });
});

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
