document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();

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
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/cobrancas/listar?dataInicio=${dataInicio}&dataFim=${dataFim}`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
                    <button class="btn-acao" onclick="verDetalhesCliente(${item.cliente_id})" title="Ver Detalhes">🔍</button>
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
    const textoOriginal = selectElement.parentElement.innerHTML; // Backup simples

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/cobrancas/atualizar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cliente_id: clienteId,
                data_inicio: dataInicio,
                data_fim: dataFim,
                status: novoStatus,
                valor_total: valorTotal
            })
        });

        if (!response.ok) throw new Error('Falha ao salvar');

        // Opcional: Mostrar um toast/notificação de sucesso
        // console.log(`Status de ${nomeCliente} atualizado para ${novoStatus}`);

    } catch (error) {
        alert('Erro ao atualizar status. Recarregue a página.');
        console.error(error);
        // Reverte visualmente se der erro (reload é mais seguro, mas isso ajuda)
        selectElement.value = novoStatus === 'Pago' ? 'Pendente' : 'Pago';
    }
}

function verDetalhesCliente(id) {
    window.location.href = `cliente-detalhes.html?id=${id}`;
}
