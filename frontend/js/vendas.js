checkAuth();

const logoutBtn = document.getElementById('logout-btn');
const vendasTableBody = document.getElementById('vendas-table-body');
const detailsModal = document.getElementById('details-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const filtrosForm = document.getElementById('filtros-vendas-form');
const limparFiltrosBtn = document.getElementById('limpar-filtros-btn');
const filtroVendedorSelect = document.getElementById('filtro-vendedor');

function formatarData(dataISO) {
    if (!dataISO) return '';
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR');
}

async function carregarVendas(queryParams = '') {
    try {
        const response = await fetchWithAuth(`/api/vendas${queryParams}`);
        if (!response.ok) throw new Error('Erro ao buscar histórico de vendas.');

        const vendas = await response.json();
        vendasTableBody.innerHTML = '';

        if (vendas.length === 0) {
            vendasTableBody.innerHTML = '<tr><td colspan="6">Nenhuma venda encontrada para os filtros aplicados.</td></tr>';
            return;
        }

        vendas.forEach(venda => {
            const tr = document.createElement('tr');
            tr.dataset.vendaId = venda.id;
            tr.innerHTML = `
                <td>#${venda.id}</td>
                <td>${venda.cliente_nome || 'Não identificado'}</td>
                <td>${venda.usuario_nome}</td>
                <td>R$ ${parseFloat(venda.valor_total).toFixed(2)}</td>
                <td>${formatarData(venda.data_venda)}</td>
                <td>
                    <button class="btn-action btn-edit">Ver Detalhes</button>
                    <button class="btn-action btn-delete btn-cancelar">Cancelar</button>
                </td>
            `;
            vendasTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error(error.message);
        alert('Não foi possível carregar o histórico de vendas.');
    }
}

async function carregarVendedores() {
    try {
        const response = await fetchWithAuth('/api/usuarios');
        if (!response.ok) throw new Error('Erro ao carregar vendedores.');
        const vendedores = await response.json();

        vendedores.forEach(vendedor => {
            const option = document.createElement('option');
            option.value = vendedor.id;
            option.textContent = vendedor.nome;
            filtroVendedorSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}

// Ação a ser executada quando o botão de cancelar for clicado
async function handleCancelClick(vendaId) {
    if (!confirm(`Tem certeza que deseja cancelar a venda #${vendaId}? Essa ação não pode ser desfeita.`)) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/api/vendas/${vendaId}`, { method: 'DELETE' });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        alert(data.message);
        carregarVendas(); // Recarrega a tabela de vendas
    } catch (error) {
        alert(error.message);
    }
}


filtrosForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const cliente = document.getElementById('filtro-cliente').value;
    const vendedor = document.getElementById('filtro-vendedor').value;

    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    if (cliente) params.append('cliente', cliente);
    if (vendedor) params.append('vendedor', vendedor);

    carregarVendas(`?${params.toString()}`);
});

limparFiltrosBtn.addEventListener('click', () => {
    filtrosForm.reset();
    carregarVendas();
});

async function abrirModalDetalhes(vendaId) {
    try {
        const response = await fetchWithAuth(`/api/vendas/${vendaId}`);
        if (!response.ok) throw new Error('Erro ao buscar detalhes da venda.');
        const detalhes = await response.json();
        document.getElementById('modal-venda-id').textContent = `#${detalhes.id}`;
        document.getElementById('modal-venda-info').innerHTML = `<p><strong>Cliente:</strong> ${detalhes.cliente_nome || 'Não identificado'}</p><p><strong>Vendedor:</strong> ${detalhes.usuario_nome}</p><p><strong>Data:</strong> ${formatarData(detalhes.data_venda)}</p><p><strong>Valor Total:</strong> R$ ${parseFloat(detalhes.valor_total).toFixed(2)}</p>`;
        const itensTbody = document.getElementById('modal-itens-body');
        itensTbody.innerHTML = '';
        detalhes.itens.forEach(item => {
            const subtotal = item.quantidade * item.preco_unitario;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.produto_nome}</td><td>${item.quantidade}</td><td>R$ ${parseFloat(item.preco_unitario).toFixed(2)}</td><td>R$ ${subtotal.toFixed(2)}</td>`;
            itensTbody.appendChild(tr);
        });
        detailsModal.style.display = 'flex';
    } catch (error) {
        console.error(error.message);
        alert('Não foi possível carregar os detalhes da venda.');
    }
}

// NOVO: Event listener para o botão de cancelar e para o botão de ver detalhes
vendasTableBody.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-cancelar')) {
        const vendaId = event.target.closest('tr').dataset.vendaId;
        handleCancelClick(vendaId);
    } else if (event.target.classList.contains('btn-edit')) {
        const vendaId = event.target.closest('tr').dataset.vendaId;
        abrirModalDetalhes(vendaId);
    }
});

closeModalBtn.addEventListener('click', () => { detailsModal.style.display = 'none'; });
detailsModal.addEventListener('click', (event) => {
    if (event.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
});


// INICIALIZAÇÃO
logoutBtn.addEventListener('click', logout);
document.addEventListener('DOMContentLoaded', () => {
    carregarVendas();
    carregarVendedores();
});
