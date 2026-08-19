/* ============================================
   RDM Gráfica — Script global
   Ativa a animação de "reveal" (fade-in + subida)
   quando os elementos com a classe .reveal entram
   na viewport. Usado por todas as páginas do site.
   ============================================ */

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
    });
});

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
