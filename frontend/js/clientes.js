checkAuth();

// --- ELEMENTOS DO DOM ---
const logoutBtn = document.getElementById('logout-btn');
const clientesTableBody = document.getElementById('clientes-table-body');
const addClienteForm = document.getElementById('add-cliente-form');
const successMessageDiv = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-cliente-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
// NOVO ELEMENTO: Campo de busca
const buscaClienteInput = document.getElementById('busca-cliente');

// --- VARIÁVEL DE ESTADO ---
// Guardará a lista completa de clientes para podermos filtrar sem ir ao banco toda hora
let todosClientes = [];


// --- FUNÇÕES DE RENDERIZAÇÃO ---

// NOVA FUNÇÃO: Responsável apenas por desenhar a tabela na tela
function renderizarClientes(listaDeClientes) {
    clientesTableBody.innerHTML = ''; // Limpa a tabela antes de preencher

    if (listaDeClientes.length === 0) {
        clientesTableBody.innerHTML = `<tr><td colspan="3">Nenhum cliente encontrado.</td></tr>`;
        return;
    }

    listaDeClientes.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.dataset.clienteId = cliente.id;
        tr.innerHTML = `
            <td><a href="cliente-detalhes.html?id=${cliente.id}" class="link-tabela">${cliente.nome}</a></td>
            <td>${cliente.telefone || 'N/A'}</td>
            <td>
                <button class="btn-action btn-edit">Editar</button>
                <button class="btn-action btn-delete">Excluir</button>
            </td>
        `;
        clientesTableBody.appendChild(tr);
    });
}


// --- FUNÇÕES DE DADOS (API) ---

// Função ATUALIZADA para carregar os clientes
async function carregarClientes() {
    try {
        const response = await fetchWithAuth('/api/clientes');
        if (!response.ok) throw new Error('Erro ao buscar clientes.');
        
        // Guarda a lista completa na nossa variável de estado
        todosClientes = await response.json();
        
        // Renderiza a lista completa na tela pela primeira vez
        renderizarClientes(todosClientes);

    } catch (error) {
        console.error(error.message);
        alert('Não foi possível carregar a lista de clientes.');
    }
}


// --- LÓGICA E EVENT LISTENERS ---

// A lógica de adicionar, editar e excluir continua a mesma...
async function handleAddSubmit(event) {
    // ... (código existente sem alterações) ...
    event.preventDefault();
    const novoCliente = {
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        cpf: document.getElementById('cpf').value,
        email: document.getElementById('email').value,
        cep: document.getElementById('cep').value,
        logradouro: document.getElementById('logradouro').value,
        numero: document.getElementById('numero').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
    };

    try {
        const response = await fetchWithAuth('/api/clientes', {
            method: 'POST',
            body: JSON.stringify(novoCliente)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Ao adicionar um novo, recarregamos a lista inteira para ter os dados mais recentes
        carregarClientes();
        addClienteForm.reset();
        successMessageDiv.textContent = 'Cliente salvo com sucesso!';
        setTimeout(() => { successMessageDiv.textContent = ''; }, 3000);
    } catch (error) {
        alert(error.message);
    }
}

async function handleEditSubmit(event) {
    // ... (código existente sem alterações) ...
    event.preventDefault();
    const id = document.getElementById('edit-cliente-id').value;
    const clienteAtualizado = {
        nome: document.getElementById('edit-nome').value,
        telefone: document.getElementById('edit-telefone').value,
        cpf: document.getElementById('edit-cpf').value,
        email: document.getElementById('edit-email').value,
        cep: document.getElementById('edit-cep').value,
        logradouro: document.getElementById('edit-logradouro').value,
        numero: document.getElementById('edit-numero').value,
        bairro: document.getElementById('edit-bairro').value,
        cidade: document.getElementById('edit-cidade').value,
        estado: document.getElementById('edit-estado').value,
    };

    try {
        const response = await fetchWithAuth(`/api/clientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clienteAtualizado)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        editModal.style.display = 'none'; // Fecha o modal
        carregarClientes(); // Recarrega a lista
    } catch (error) {
        alert(error.message);
    }
}

async function handleTableClick(event) {
    // ... (código existente sem alterações) ...
    const target = event.target;
    const tr = target.closest('tr');
    if (!tr) return;
    const clienteId = tr.dataset.clienteId;
    if (target.classList.contains('btn-delete')) {
        if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
            try {
                const response = await fetchWithAuth(`/api/clientes/${clienteId}`, { method: 'DELETE' });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                carregarClientes();
            } catch (error) {
                alert(error.message);
            }
        }
    }
    if (target.classList.contains('btn-edit')) {
        try {
            const response = await fetchWithAuth(`/api/clientes/${clienteId}`);
            if (!response.ok) throw new Error('Erro ao buscar dados do cliente.');
            const cliente = await response.json();
            document.getElementById('edit-cliente-id').value = cliente.id;
            document.getElementById('edit-nome').value = cliente.nome;
            document.getElementById('edit-telefone').value = cliente.telefone;
            document.getElementById('edit-cpf').value = cliente.cpf;
            document.getElementById('edit-email').value = cliente.email;
            document.getElementById('edit-cep').value = cliente.cep;
            document.getElementById('edit-logradouro').value = cliente.logradouro;
            document.getElementById('edit-numero').value = cliente.numero;
            document.getElementById('edit-bairro').value = cliente.bairro;
            document.getElementById('edit-cidade').value = cliente.cidade;
            document.getElementById('edit-estado').value = cliente.estado;
            editModal.style.display = 'flex';
        } catch (error) {
            alert(error.message);
        }
    }
}

// NOVO EVENT LISTENER para a busca
buscaClienteInput.addEventListener('keyup', () => {
    const termo = buscaClienteInput.value.toLowerCase();
    
    // Filtra a lista principal de clientes
    const clientesFiltrados = todosClientes.filter(cliente => 
        cliente.nome.toLowerCase().includes(termo)
    );

    // Renderiza a tabela apenas com os clientes filtrados
    renderizarClientes(clientesFiltrados);
});


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', carregarClientes);
addClienteForm.addEventListener('submit', handleAddSubmit);
editForm.addEventListener('submit', handleEditSubmit);
clientesTableBody.addEventListener('click', handleTableClick);
cancelEditBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
logoutBtn.addEventListener('click', logout);