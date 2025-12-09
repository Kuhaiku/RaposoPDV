document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO 1: Usando o nome correto da função do seu auth.js
    if (!checkAuth()) return; // Se não estiver logado, o auth.js já redireciona

    const btnBuscar = document.getElementById('btn-buscar');
    const dataInicioInput = document.getElementById('data-inicio');
    const dataFimInput = document.getElementById('data-fim');
    
    // Define datas padrão (início e fim do mês atual)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    dataInicioInput.valueAsDate = primeiroDia;
    dataFimInput.valueAsDate = ultimoDia;

    btnBuscar.addEventListener('click', buscarCobrancas);
    
    // Configura o botão de sair (Logout)
    const btnSair = document.getElementById('btn-sair'); // Se existir no menu
    if (btnSair) {
        btnSair.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Busca inicial automática
    buscarCobrancas();
});

async function buscarCobrancas() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const tbody = document.getElementById('lista-cobrancas');
    const tfoot = document.getElementById('tfoot-totais');
    const totalGeralEl = document.getElementById('total-geral-periodo');

    if (!dataInicio || !dataFim) {
        alert('Selecione ambas as datas.');
        return;
    }

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando...</td></tr>';

    try {
        // CORREÇÃO 2: Usando fetchWithAuth do seu sistema
        // Note que removemos 'http://localhost:3000' e o header manual do token
        const response = await fetchWithAuth(`/api/cobrancas/listar?dataInicio=${dataInicio}&dataFim=${dataFim}`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error('Erro ao buscar dados');

        const dados = await response.json();
        tbody.innerHTML = '';

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma compra encontrada neste período.</td></tr>';
            tfoot.style.display = 'none';
            return;
        }

        let somaTotal = 0;

        dados.forEach(item => {
            const tr = document.createElement('tr');
            const valor = parseFloat(item.total_comprado);
            somaTotal += valor;

            // Define cor do select baseada no valor inicial
            const corSelect = item.status_pagamento === 'Pago' ? '#d4edda' : '#ffeeba';

            tr.innerHTML = `
                <td>${item.cliente_nome}</td>
                <td>${item.cliente_telefone || '-'}</td>
                <td>R$ ${valor.toFixed(2).replace('.', ',')}</td>
                <td>
                    <select class="select-status" 
                            style="background-color: ${corSelect}"
                            onchange="alterarStatus(this, ${item.cliente_id}, '${item.cliente_nome}', ${valor})">
                        <option value="Pendente" ${item.status_pagamento === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Pago" ${item.status_pagamento === 'Pago' ? 'selected' : ''}>Pago</option>
                    </select>
                </td>
                <td>
                    <button class="btn" style="padding: 5px 10px; width: auto;" onclick="verDetalhesCliente(${item.cliente_id})" title="Ver Detalhes">🔍</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        totalGeralEl.textContent = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
        tfoot.style.display = 'table-row-group';

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro ao carregar dados.</td></tr>';
    }
}

async function alterarStatus(selectElement, clienteId, nomeCliente, valorTotal) {
    const novoStatus = selectElement.value;
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;

    // Feedback visual imediato
    selectElement.style.backgroundColor = novoStatus === 'Pago' ? '#d4edda' : '#ffeeba';

    try {
        // CORREÇÃO 3: Usando fetchWithAuth para atualizar também
        const response = await fetchWithAuth('/api/cobrancas/atualizar', {
            method: 'POST',
            body: JSON.stringify({
                cliente_id: clienteId,
                data_inicio: dataInicio,
                data_fim: dataFim,
                status: novoStatus,
                valor_total: valorTotal
            })
            // Não precisa setar headers Content-Type nem Authorization, o fetchWithAuth faz isso
        });

        if (!response.ok) throw new Error('Falha ao salvar');

        // Sucesso silencioso (ou adicione um toast se preferir)

    } catch (error) {
        alert('Erro ao atualizar status. Recarregue a página.');
        console.error(error);
        // Reverte visualmente se der erro
        selectElement.value = novoStatus === 'Pago' ? 'Pendente' : 'Pago';
        selectElement.style.backgroundColor = selectElement.value === 'Pago' ? '#d4edda' : '#ffeeba';
    }
}

function verDetalhesCliente(id) {
    window.location.href = `cliente-detalhes.html?id=${id}`;
}
