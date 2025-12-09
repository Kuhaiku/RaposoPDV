document.addEventListener('DOMContentLoaded', () => {
    // Autenticação integrada
    if (typeof checkAuth === 'function' && !checkAuth()) return;

    const btnBuscar = document.getElementById('btn-buscar');
    const btnSair = document.getElementById('btn-sair');
    
    // Datas padrão: Início e fim do mês atual
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    document.getElementById('data-inicio').valueAsDate = primeiroDia;
    document.getElementById('data-fim').valueAsDate = ultimoDia;

    btnBuscar.addEventListener('click', buscarCobrancas);
    
    if (btnSair) {
        btnSair.addEventListener('click', () => {
            if (typeof logout === 'function') logout();
            else window.location.href = 'login.html';
        });
    }

    // Busca inicial
    buscarCobrancas();
});

async function buscarCobrancas() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const tbody = document.getElementById('lista-cobrancas');
    const resumoTotal = document.getElementById('resumo-total');

    if (!dataInicio || !dataFim) {
        alert('Por favor, selecione as datas de início e fim.');
        return;
    }

    // Loading State
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p>Carregando dados...</p>
                </div>
            </td>
        </tr>`;

    try {
        // Usa fetchWithAuth se disponível, ou fetch padrão com token manual
        let response;
        if (typeof fetchWithAuth === 'function') {
            response = await fetchWithAuth(`/api/cobrancas/listar?dataInicio=${dataInicio}&dataFim=${dataFim}`, { method: 'GET' });
        } else {
            const token = localStorage.getItem('token'); // Fallback antigo
            response = await fetch(`http://localhost:3000/api/cobrancas/listar?dataInicio=${dataInicio}&dataFim=${dataFim}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        if (!response.ok) throw new Error('Erro na requisição');
        
        const dados = await response.json();
        tbody.innerHTML = '';

        if (dados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                        <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">block</span>
                        <p>Nenhuma venda encontrada para este período.</p>
                    </td>
                </tr>`;
            resumoTotal.textContent = 'Total: R$ 0,00';
            return;
        }

        let somaTotal = 0;

        dados.forEach(item => {
            const valor = parseFloat(item.total_comprado);
            somaTotal += valor;

            // Estilos de Status (Tailwind)
            const isPago = item.status_pagamento === 'Pago';
            const statusClass = isPago 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-yellow-100 text-yellow-800 border-yellow-200';

            const tr = document.createElement('tr');
            tr.className = 'table-row';
            tr.innerHTML = `
                <td class="table-cell font-medium text-gray-900">${item.cliente_nome}</td>
                <td class="table-cell text-gray-500">${item.cliente_telefone || '-'}</td>
                <td class="table-cell font-bold text-gray-800">R$ ${valor.toFixed(2).replace('.', ',')}</td>
                <td class="table-cell">
                    <select onchange="alterarStatus(this, ${item.cliente_id}, '${item.cliente_nome}', ${valor})"
                            class="rounded-full px-3 py-1 text-xs font-bold border ${statusClass} cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-primary outline-none appearance-none pr-8">
                        <option value="Pendente" ${!isPago ? 'selected' : ''}>Pendente</option>
                        <option value="Pago" ${isPago ? 'selected' : ''}>Pago</option>
                    </select>
                </td>
                <td class="table-cell text-center">
                    <button onclick="verDetalhesCliente(${item.cliente_id})" 
                            class="text-gray-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-100" 
                            title="Ver Histórico Completo">
                        <span class="material-symbols-outlined text-[20px]">visibility</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        resumoTotal.textContent = `Total: R$ ${somaTotal.toFixed(2).replace('.', ',')}`;

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Erro ao carregar dados. Tente novamente.</td></tr>`;
    }
}

async function alterarStatus(selectElement, clienteId, nomeCliente, valorTotal) {
    const novoStatus = selectElement.value;
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    
    // Atualização Visual Imediata (Optimistic UI)
    const isPago = novoStatus === 'Pago';
    selectElement.className = `rounded-full px-3 py-1 text-xs font-bold border cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-primary outline-none appearance-none pr-8 ${
        isPago ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }`;

    try {
        const body = {
            cliente_id: clienteId,
            data_inicio: dataInicio,
            data_fim: dataFim,
            status: novoStatus,
            valor_total: valorTotal
        };

        let response;
        if (typeof fetchWithAuth === 'function') {
            response = await fetchWithAuth('/api/cobrancas/atualizar', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        } else {
             // Fallback
             const token = localStorage.getItem('token');
             response = await fetch('http://localhost:3000/api/cobrancas/atualizar', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
        }

        if (!response.ok) throw new Error('Erro ao salvar');

    } catch (error) {
        alert('Erro ao atualizar. A página será recarregada.');
        window.location.reload();
    }
}

function verDetalhesCliente(id) {
    window.location.href = `cliente-detalhes.html?id=${id}`;
}
