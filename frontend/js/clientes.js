// Garante que checkAuth e fetchWithAuth estão disponíveis (de auth.js)
if (typeof checkAuth !== 'function' || typeof fetchWithAuth !== 'function') {
    console.error("Funções 'checkAuth' ou 'fetchWithAuth' não encontradas. Verifique se auth.js foi carregado corretamente.");
} else {
    checkAuth(); // Verifica se o usuário está logado
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos DOM ---
    const clientListContainer = document.getElementById('client-list-container');
    const clientListPlaceholder = document.getElementById('client-list-placeholder');
    const searchInput = document.getElementById('search-client-input');
    const addClientButton = document.getElementById('add-client-button');

    // --- Modal Adicionar Cliente ---
    const addClientModal = document.getElementById('add-client-modal');
    const addClientForm = document.getElementById('add-client-form');
    const addClientMessage = document.getElementById('add-client-message');

    // --- Modal Editar Cliente (NOVO) ---
    const editClientModal = document.getElementById('edit-client-modal');
    const editClientForm = document.getElementById('edit-client-form');
    const editClientMessage = document.getElementById('edit-client-message');
    const editClientIdInput = document.getElementById('edit-client-id'); // Campo hidden para o ID

    // --- Botões comuns de fechar modal ---
    const closeModalButtons = document.querySelectorAll('.close-modal-btn');

    // --- Estado ---
    let todosClientes = [];
    let termoBusca = '';
    let clientesVisiveis = [];

    // --- Funções Auxiliares ---
    const showModalMessage = (element, message, isError = false) => {
        if (!element) return;
        element.textContent = message;
        element.classList.remove('hidden', 'text-green-600', 'text-red-600');
        element.classList.add(isError ? 'text-red-600' : 'text-green-600');
     };
    const clearModalMessage = (element) => {
        if (!element) return;
        element.textContent = '';
        element.classList.add('hidden');
     };
    const openModal = (modalElement) => {
        if (modalElement) modalElement.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    };
    const closeModal = (modalElement) => {
        if (modalElement) modalElement.classList.remove('is-open');
        document.body.style.overflow = '';
        // Limpa mensagens ao fechar qualquer modal
        if (addClientMessage) clearModalMessage(addClientMessage);
        if (editClientMessage) clearModalMessage(editClientMessage);
    };

    // --- Funções Principais ---

    // Carrega TODOS os clientes da API
    const carregarTodosClientes = async () => {
        clientListPlaceholder.textContent = 'Carregando clientes...';
        clientListPlaceholder.classList.remove('hidden');
        clientListContainer.innerHTML = '';

        try {
            const response = await fetchWithAuth('/api/clientes');
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
                 throw new Error(errorData.message || `Erro ${response.status}`);
            }
            todosClientes = await response.json();
            todosClientes.sort((a, b) => a.nome.localeCompare(b.nome));
            renderizarClientes();

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            clientListPlaceholder.textContent = `Erro: ${error.message}. Tente novamente.`;
            clientListPlaceholder.classList.remove('hidden');
            todosClientes = [];
        }
    };

    // Renderiza a lista de clientes na tela com base na busca (COM BOTÕES)
    const renderizarClientes = () => {
        clientListContainer.innerHTML = '';
        clientListPlaceholder.classList.add('hidden');

        clientesVisiveis = todosClientes.filter(cliente => {
            const nomeMatch = cliente.nome.toLowerCase().includes(termoBusca);
            const telMatch = cliente.telefone && cliente.telefone.toLowerCase().includes(termoBusca);
            return nomeMatch || telMatch; // Busca por nome ou telefone
        });

        if (clientesVisiveis.length === 0) {
            clientListPlaceholder.textContent = `Nenhum cliente encontrado ${termoBusca ? 'para "' + termoBusca + '"' : ''}.`;
            clientListPlaceholder.classList.remove('hidden');
            return;
        }

        clientesVisiveis.forEach(cliente => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 flex justify-between items-start client-card'; // Adicionado client-card para referência
            card.dataset.clientId = cliente.id; // Mantém o ID no card

            card.innerHTML = `
                <div class="flex-1 min-w-0 mr-4">
                    <h2 class="text-base font-semibold text-text-light dark:text-text-dark truncate" title="${cliente.nome}">${cliente.nome}</h2>
                    ${cliente.telefone ? `<p class="text-sm text-subtext-light dark:text-subtext-dark">Tel: ${cliente.telefone}</p>` : ''}
                     <a href="cliente-detalhes.html?id=${cliente.id}" class="text-xs text-primary hover:underline mt-1 inline-block">Ver Detalhes</a>
                 </div>
                <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <button class="btn-edit flex items-center justify-center rounded-md h-7 px-2 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                        <span class="material-symbols-outlined mr-1 text-sm">edit</span> Editar
                    </button>
                    <button class="btn-delete flex items-center justify-center rounded-md h-7 px-2 bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors">
                        <span class="material-symbols-outlined mr-1 text-sm">delete</span> Excluir
                    </button>
                </div>
            `;
            clientListContainer.appendChild(card);
        });
    };

     // --- Funções de Edição (NOVO) ---
    const abrirModalEdicao = async (clienteId) => {
        clearModalMessage(editClientMessage);
        editClientForm.reset(); // Limpa antes de preencher
        openModal(editClientModal);

        try {
            // 1. Buscar dados atuais do cliente
            const response = await fetchWithAuth(`/api/clientes/${clienteId}`);
            if (!response.ok) throw new Error('Falha ao buscar dados do cliente para edição.');
            const cliente = await response.json();

            // 2. Preencher o formulário de edição
            editClientIdInput.value = cliente.id; // Seta o ID no campo hidden
            document.getElementById('edit-nome').value = cliente.nome || '';
            document.getElementById('edit-telefone').value = cliente.telefone || '';
            document.getElementById('edit-cpf').value = cliente.cpf || '';
            document.getElementById('edit-email').value = cliente.email || '';
            document.getElementById('edit-cep').value = cliente.cep || '';
            document.getElementById('edit-logradouro').value = cliente.logradouro || '';
            document.getElementById('edit-numero').value = cliente.numero || '';
            document.getElementById('edit-bairro').value = cliente.bairro || '';
            document.getElementById('edit-cidade').value = cliente.cidade || '';
            document.getElementById('edit-estado').value = cliente.estado || '';

        } catch (error) {
            console.error("Erro ao preparar edição:", error);
            showModalMessage(editClientMessage, `Erro ao carregar dados: ${error.message}`, true);
            // Poderia desabilitar o form ou fechar o modal
        }
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        clearModalMessage(editClientMessage);
        const submitButton = editClientModal.querySelector('button[type="submit"]');
        if (!submitButton) return;

        submitButton.disabled = true;
        submitButton.innerHTML = `<div class="spinner mr-2 inline-block"></div> Salvando...`;

        const clienteId = editClientIdInput.value;
        const formData = new FormData(editClientForm);
        const clienteAtualizado = Object.fromEntries(formData.entries());
         // Remove o campo 'id' do objeto que será enviado no body, pois ele vai na URL
         delete clienteAtualizado.id;

         // Validação básica (nome e telefone)
         if (!clienteAtualizado.nome || !clienteAtualizado.telefone) {
             showModalMessage(editClientMessage, "Nome e Telefone são obrigatórios.", true);
             submitButton.disabled = false;
             submitButton.textContent = 'Salvar Alterações';
             return;
         }


        try {
            const response = await fetchWithAuth(`/api/clientes/${clienteId}`, {
                method: 'PUT',
                body: JSON.stringify(clienteAtualizado)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao atualizar cliente.');

            showModalMessage(editClientMessage, 'Cliente atualizado com sucesso!');
            await carregarTodosClientes(); // Recarrega a lista

            setTimeout(() => {
                closeModal(editClientModal);
            }, 1500);

        } catch (error) {
            console.error("Erro ao atualizar cliente:", error);
            showModalMessage(editClientMessage, `Erro: ${error.message}`, true);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Alterações';
            }
        }
    };

     // --- Função de Exclusão (NOVO) ---
    const handleDeleteClick = async (clienteId, nomeCliente) => {
         if (!confirm(`Tem certeza que deseja excluir o cliente "${nomeCliente}"?\n\nATENÇÃO: Esta ação não pode ser desfeita e só funcionará se o cliente não tiver vendas associadas.`)) {
             return;
         }

         // Encontra o botão no card para adicionar o spinner
         const card = clientListContainer.querySelector(`.client-card[data-client-id="${clienteId}"]`);
         const deleteButton = card ? card.querySelector('.btn-delete') : null;
         if (deleteButton) {
              deleteButton.disabled = true;
              deleteButton.innerHTML = '<div class="spinner spinner-small"></div>'; // Spinner pequeno
         }

         try {
             const response = await fetchWithAuth(`/api/clientes/${clienteId}`, {
                 method: 'DELETE'
             });
             const data = await response.json(); // Tenta ler a resposta mesmo em caso de erro
             if (!response.ok) {
                  // Mensagem de erro específica se for por causa de vendas associadas
                  if (response.status === 400 && data.message.includes("vendas existentes")) {
                      throw new Error(data.message); // Usa a mensagem do backend
                  } else {
                      throw new Error(data.message || 'Erro ao excluir cliente.');
                  }
             }

             alert(data.message || 'Cliente excluído com sucesso!');
             await carregarTodosClientes(); // Recarrega a lista

         } catch (error) {
             console.error("Erro ao excluir cliente:", error);
             alert(`Erro: ${error.message}`);
             // Restaura o botão se deu erro
             if (deleteButton) {
                  deleteButton.disabled = false;
                  deleteButton.innerHTML = '<span class="material-symbols-outlined mr-1 text-sm">delete</span> Excluir';
             }
         }
     };


    // --- Tratamento de Eventos ---

    // Busca
    searchInput.addEventListener('input', () => {
        clearTimeout(searchInput.timer);
        searchInput.timer = setTimeout(() => {
            termoBusca = searchInput.value.toLowerCase();
            renderizarClientes();
        }, 300);
    });

    // Abrir Modal Adicionar Cliente
    addClientButton.addEventListener('click', () => {
        addClientForm.reset();
        clearModalMessage(addClientMessage);
        openModal(addClientModal);
    });

    // Fechar Modais (botões 'X' e 'Cancelar')
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal'); // Encontra o modal pai
            if (modal) closeModal(modal);
        });
    });

     // Fechar Modais (clicando fora)
     [addClientModal, editClientModal].forEach(modal => {
          if (modal) {
               modal.addEventListener('click', (event) => {
                    if (event.target === modal) closeModal(modal);
               });
          }
     });


    // Submeter Formulário Adicionar Cliente
    addClientForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearModalMessage(addClientMessage);
        const submitButton = addClientModal.querySelector('button[type="submit"]');
        if (!submitButton) return;

        submitButton.disabled = true;
        submitButton.innerHTML = `<div class="spinner mr-2 inline-block"></div> Salvando...`;

        const formData = new FormData(addClientForm);
        const novoCliente = Object.fromEntries(formData.entries());

        if (!novoCliente.nome || !novoCliente.telefone) { /* ... (validação) ... */
             showModalMessage(addClientMessage, "Nome e Telefone são obrigatórios.", true);
             submitButton.disabled = false;
             submitButton.textContent = 'Salvar Cliente';
             return;
         }

        try {
            const response = await fetchWithAuth('/api/clientes', { method: 'POST', body: JSON.stringify(novoCliente) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao salvar.');

            showModalMessage(addClientMessage, 'Cliente salvo com sucesso!');
            await carregarTodosClientes();

            setTimeout(() => { closeModal(addClientModal); }, 1500);

        } catch (error) {
            console.error("Erro ao adicionar:", error);
            showModalMessage(addClientMessage, `Erro: ${error.message}`, true);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Cliente';
            }
        }
    });

     // Submeter Formulário Editar Cliente (NOVO)
     editClientForm.addEventListener('submit', handleEditSubmit);

     // Event Listeners para botões Editar e Excluir (NOVO - Delegação)
     clientListContainer.addEventListener('click', (event) => {
         const editButton = event.target.closest('.btn-edit');
         const deleteButton = event.target.closest('.btn-delete');
         const card = event.target.closest('.client-card');

         if (!card) return; // Sai se o clique não foi dentro de um card

         const clienteId = card.dataset.clientId;
         const nomeClienteEl = card.querySelector('h2'); // Pega o nome do H2
         const nomeCliente = nomeClienteEl ? nomeClienteEl.textContent : 'Cliente';

         if (editButton) {
             abrirModalEdicao(clienteId);
         } else if (deleteButton) {
             handleDeleteClick(clienteId, nomeCliente);
         }
         // Se clicar em "Ver Detalhes", o link <a> cuidará da navegação
     });


    // --- Inicialização ---
    carregarTodosClientes();

}); // Fim do DOMContentLoaded
