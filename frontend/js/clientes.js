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
    const closeModalButtons = document.querySelectorAll('.close-modal-btn'); // Botões 'X' e 'Cancelar'

    // --- Estado ---
    let todosClientes = [];
    let termoBusca = '';
    let clientesVisiveis = []; // Array para guardar os clientes atualmente exibidos

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
        document.body.style.overflow = 'hidden'; // Trava scroll do fundo
    };
    const closeModal = (modalElement) => {
        if (modalElement) modalElement.classList.remove('is-open');
        document.body.style.overflow = ''; // Libera scroll do fundo
    };

    // --- Funções Principais ---

    // Carrega TODOS os clientes da API
    const carregarTodosClientes = async () => {
        clientListPlaceholder.textContent = 'Carregando clientes...';
        clientListPlaceholder.classList.remove('hidden');
        clientListContainer.innerHTML = ''; // Limpa lista

        try {
            const response = await fetchWithAuth('/api/clientes'); // Endpoint para listar clientes
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao buscar clientes.' }));
                 throw new Error(errorData.message || `Erro ${response.status}`);
            }
            todosClientes = await response.json();

            // Ordena por nome
            todosClientes.sort((a, b) => a.nome.localeCompare(b.nome));

            renderizarClientes(); // Renderiza a lista inicial

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            clientListPlaceholder.textContent = `Erro ao carregar clientes: ${error.message}. Tente novamente.`;
            clientListPlaceholder.classList.remove('hidden');
            todosClientes = [];
        }
    };

    // Renderiza a lista de clientes na tela com base na busca
    const renderizarClientes = () => {
        clientListContainer.innerHTML = ''; // Limpa a lista
        clientListPlaceholder.classList.add('hidden'); // Esconde placeholder

        clientesVisiveis = todosClientes.filter(cliente => {
            const nomeMatch = cliente.nome.toLowerCase().includes(termoBusca);
            // Poderia adicionar busca por telefone ou CPF aqui se quisesse
            // const telefoneMatch = cliente.telefone && cliente.telefone.includes(termoBusca);
            // return nomeMatch || telefoneMatch;
            return nomeMatch;
        });

        if (clientesVisiveis.length === 0) {
            clientListPlaceholder.textContent = `Nenhum cliente encontrado ${termoBusca ? 'para "' + termoBusca + '"' : ''}.`;
            clientListPlaceholder.classList.remove('hidden');
            return;
        }

        clientesVisiveis.forEach(cliente => {
            const card = document.createElement('div');
            // Remove 'client-card' se não for mais usada para estilização específica
            card.className = 'bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700';
            card.dataset.clientId = cliente.id; // Adiciona ID para navegação

            // Cria o link para a página de detalhes
            const linkDetalhes = document.createElement('a');
            linkDetalhes.href = `cliente-detalhes.html?id=${cliente.id}`;
            linkDetalhes.className = 'block p-4 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors'; // Estilo do link clicável

            linkDetalhes.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-base font-semibold text-text-light dark:text-text-dark truncate" title="${cliente.nome}">${cliente.nome}</h2>
                         ${cliente.telefone ? `<p class="text-sm text-subtext-light dark:text-subtext-dark">Tel: ${cliente.telefone}</p>` : ''}
                         </div>
                    <span class="material-symbols-outlined text-primary">chevron_right</span>
                </div>
            `;
            card.appendChild(linkDetalhes); // Adiciona o link ao card
            clientListContainer.appendChild(card); // Adiciona o card ao container
        });
    };

    // --- Tratamento de Eventos ---

    // Busca
    searchInput.addEventListener('input', () => {
        clearTimeout(searchInput.timer);
        searchInput.timer = setTimeout(() => {
            termoBusca = searchInput.value.toLowerCase();
            renderizarClientes();
        }, 300); // Debounce de 300ms
    });

    // Abrir Modal Adicionar Cliente
    addClientButton.addEventListener('click', () => {
        addClientForm.reset(); // Limpa o formulário
        clearModalMessage(addClientMessage); // Limpa mensagens
        openModal(addClientModal); // Abre o modal
    });

    // Fechar Modal (botões 'X' e 'Cancelar')
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Encontra o modal pai do botão clicado
            const modal = button.closest('.fixed.inset-0');
            if (modal) {
                closeModal(modal);
            }
        });
    });

     // Fechar Modal (clicando fora)
     addClientModal.addEventListener('click', (event) => {
         // Verifica se o clique foi diretamente no backdrop (fundo)
         if (event.target === addClientModal) {
             closeModal(addClientModal);
         }
     });


    // Submeter Formulário Adicionar Cliente
    addClientForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearModalMessage(addClientMessage);
        // Seleciona o botão de submit dentro do modal
        const submitButton = addClientModal.querySelector('button[type="submit"]');
        if (!submitButton) {
             console.error("Botão 'Salvar Cliente' não encontrado no modal.");
             showModalMessage(addClientMessage, "Erro: Botão salvar não encontrado.", true);
             return;
        }

        submitButton.disabled = true;
        // Adiciona spinner ao botão
        submitButton.innerHTML = `<div class="spinner mr-2 inline-block"></div> Salvando...`;

        const formData = new FormData(addClientForm);
        const novoCliente = Object.fromEntries(formData.entries());

        // Simples validação para campos obrigatórios (Nome, Telefone)
        if (!novoCliente.nome || !novoCliente.telefone) {
            showModalMessage(addClientMessage, "Nome e Telefone são obrigatórios.", true);
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Cliente';
            return;
        }


        try {
            const response = await fetchWithAuth('/api/clientes', {
                method: 'POST',
                body: JSON.stringify(novoCliente)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao salvar cliente.');

            showModalMessage(addClientMessage, 'Cliente salvo com sucesso!');
            await carregarTodosClientes(); // Recarrega a lista

            setTimeout(() => {
                closeModal(addClientModal); // Fecha o modal após sucesso
            }, 1500); // Aguarda 1.5s

        } catch (error) {
            console.error("Erro ao adicionar cliente:", error);
            showModalMessage(addClientMessage, `Erro: ${error.message}`, true);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Cliente'; // Restaura texto
            }
        }
    });

    // --- Inicialização ---
    carregarTodosClientes(); // Carrega os clientes ao iniciar

}); // Fim do DOMContentLoaded
