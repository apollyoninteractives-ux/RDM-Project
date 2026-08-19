// A listagem de feedbacks é montada dinamicamente aqui, buscando os
// dados que os usuários enviaram pelo formulário de feedback do site.
//
// Formato esperado de cada feedback (ajuste conforme o back-end):
// { nome: 'Fulano', mensagem: 'Adorei o atendimento!', data: '2026-07-20' }
//
// Exemplo de como inserir um item na lista:
//
// const li = document.createElement('li');
// li.innerHTML = `
//   <div class="feedback-header">
//     <span class="feedback-nome">${nome}</span>
//     <span class="feedback-data">${data}</span>
//   </div>
//   <p class="feedback-mensagem">${mensagem}</p>
//   <button class="btn-admin btn-admin-sm">excluir</button>
// `;
// document.getElementById('listaFeedbacks').appendChild(li);
