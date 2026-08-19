// Atualiza o textinho de confirmação abaixo de cada quadradinho de upload.
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

// A listagem de uploads é montada dinamicamente aqui.
// Cada item deve ser adicionado em #listaUploads, por exemplo:
//
// const li = document.createElement('li');
// li.innerHTML = `<span>${nomeDoArquivo}</span><button class="btn-admin btn-admin-sm">excluir</button>`;
// document.getElementById('listaUploads').appendChild(li);
