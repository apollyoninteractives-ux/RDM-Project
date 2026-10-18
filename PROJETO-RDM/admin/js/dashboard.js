document.querySelectorAll('.upload-input').forEach(input => {
    const status = input.closest('.admin-col-upload').querySelector('.upload-status');
    input.addEventListener('change', () => {
        const qtd = input.files.length;
        if (qtd === 0) {
            status.textContent = 'Nenhum arquivo selecionado';
            status.classList.remove('upload-status-ok');
        } else if (qtd === 1) {
            status.textContent = '1 arquivo selecionado';
            status.classList.add('upload-status-ok');
        } else {
            status.textContent = `${qtd} arquivos selecionados`;
            status.classList.add('upload-status-ok');
        }
    });
});
