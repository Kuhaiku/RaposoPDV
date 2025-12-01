// Garante que checkAuth e fetchWithAuth estão disponíveis (de auth.js)
if (typeof checkAuth !== 'function' || typeof fetchWithAuth !== 'function') {
    console.error("Funções 'checkAuth' ou 'fetchWithAuth' não encontradas.");
} else {
    checkAuth(); // Verifica login
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores DOM ---
    const vendasListContainer = document.getElementById('vendas-list-container');
    const vendasListPlaceholder = document.getElementById('vendas-list-placeholder');
    const searchButton = document.getElementById('search-button'); 

    // --- Filtros ---
    const filtrosForm = document.getElementById('filtros-vendas-form');
    const limparFiltrosBtn = document.getElementById('limpar-filtros-btn');
    const filtroVendedorSelect = document.getElementById('filtro-vendedor');
    
    // --- Relatório ---
    const btnRelatorioItens = document.getElementById('btn-relatorio-itens');
    const relatorioTemplate = document.getElementById('relatorio-template');

    // --- Modal Detalhes ---
    const detailsModal = document.getElementById('details-modal');
    const modalVendaIdEl = document.getElementById('modal-venda-id');
    const modalVendaInfoEl = document.getElementById('modal-venda-info');
    const modalItensBody = document.getElementById('modal-itens-body');
    const modalPagamentosList = document.getElementById('modal-pagamentos-list');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn'); 

    // --- Estado ---
    let todasVendas = []; 
    let vendedores = []; 

    // --- Funções Auxiliares ---
    const formatCurrency = (value) => {
        const number = parseFloat(value) || 0;
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
     };
    const formatDateTime = (dataISO) => {
        if (!dataISO) return 'N/A';
        return new Date(dataISO).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
     };
     const formatDateShort = (dataISO) => { 
          if (!dataISO) return 'N/A';
          return new Date(dataISO).toLocaleDateString('pt-BR');
     };
    const openModal = (modalElement) => {
        if (modalElement) modalElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
     };
    const closeModal = (modalElement) => {
        if (modalElement) modalElement.classList.add('hidden'); 
        document.body.style.overflow = '';
     };

     // Agrupa vendas por Mês/Ano
     const groupByMonthYear = (vendas) => {
          return vendas.reduce((acc, venda) => {
               const date = new Date(venda.data_venda);
               const month = (date.getMonth() + 1).toString().padStart(2, '0');
               const year = date.getFullYear();
               const key = `${month}/${year}`;
               if (!acc[key]) {
                    acc[key] = { mesAno: key, vendas: [], totalMes: 0 };
               }
               acc[key].vendas.push(venda);
               acc[key].totalMes += parseFloat(venda.valor_total || 0);
               return acc;
          }, {});
     };


    // --- Funções Principais ---

    // Carrega vendedores para o filtro
    async function carregarVendedores() {
        try {
            const response = await fetchWithAuth('/api/usuarios'); 
            if (!response.ok) throw new Error('Erro ao carregar vendedores.');
            vendedores = await response.json();

            filtroVendedorSelect.innerHTML = '<option value="">Todos</option>';

            vendedores.forEach(vendedor => {
                const option = document.createElement('option');
                option.value = vendedor.id;
                option.textContent = vendedor.nome;
                filtroVendedorSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Falha ao carregar vendedores:', error);
        }
    }


    // Carrega as vendas da API com base nos filtros
    async function carregarVendas(queryParams = '') {
        vendasListPlaceholder.textContent = 'Carregando histórico...';
        vendasListPlaceholder.classList.remove('hidden');
        vendasListContainer.innerHTML = ''; 

        try {
            const response = await fetchWithAuth(`/api/vendas${queryParams}`);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                 throw new Error(errorData.message || `Erro ${response.status}`);
            }
            todasVendas = await response.json();

            renderizarVendasAgrupadas(); 

        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            vendasListPlaceholder.textContent = `Erro ao carregar histórico: ${error.message}.`;
            vendasListPlaceholder.classList.remove('hidden');
            todasVendas = [];
        }
    }

    // Renderiza a lista de vendas agrupadas por mês/ano
    const renderizarVendasAgrupadas = () => {
        vendasListContainer.innerHTML = ''; 
        vendasListPlaceholder.classList.add('hidden'); 

         const vendasFiltradasPorBusca = todasVendas; 

        if (vendasFiltradasPorBusca.length === 0) {
            vendasListPlaceholder.textContent = 'Nenhuma venda encontrada para os filtros aplicados.';
            vendasListPlaceholder.classList.remove('hidden');
            return;
        }

        const vendasAgrupadas = groupByMonthYear(vendasFiltradasPorBusca);

        const mesesOrdenados = Object.keys(vendasAgrupadas).sort((a, b) => {
             const [mesA, anoA] = a.split('/');
             const [mesB, anoB] = b.split('/');
             return new Date(anoB, mesB - 1) - new Date(anoA, mesA - 1);
        });


        mesesOrdenados.forEach(mesAno => {
            const grupo = vendasAgrupadas[mesAno];
            const grupoDiv = document.createElement('div');
            grupoDiv.className = 'bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700';

            grupoDiv.innerHTML = `
                <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-base font-semibold text-text-light dark:text-text-dark">${mesAno}</h2>
                    <p class="text-sm text-subtext-light dark:text-subtext-dark">Total: ${formatCurrency(grupo.totalMes)}</p>
                </div>
                <ul class="divide-y divide-gray-200 dark:divide-gray-700">
                    ${grupo.vendas.map(venda => `
                        <li class="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-700/50 cursor-pointer venda-item" data-venda-id="${venda.id}">
                            <div class="flex-1 min-w-0 mr-4">
                                <p class="font-medium text-text-light dark:text-text-dark truncate">${venda.cliente_nome || 'Não identificado'}</p>
                                <p class="text-xs text-subtext-light dark:text-subtext-dark">Vendedor: ${venda.usuario_nome || '?'} - ${formatDateTime(venda.data_venda)}</p>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <p class="font-medium text-success dark:text-green-400">${formatCurrency(venda.valor_total)}</p>
                                <button class="btn-cancelar text-xs text-danger hover:underline mt-1" data-venda-id="${venda.id}">Cancelar</button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
            vendasListContainer.appendChild(grupoDiv);
        });
    };

    // Abre o modal de detalhes da venda
    async function abrirModalDetalhes(vendaId) {
        modalVendaIdEl.textContent = `#${vendaId}`;
        modalVendaInfoEl.innerHTML = '<p>Carregando...</p>';
        modalItensBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Carregando...</td></tr>';
        modalPagamentosList.innerHTML = '<p>Carregando...</p>';
        openModal(detailsModal); 

        try {
            const response = await fetchWithAuth(`/api/vendas/${vendaId}`);
            if (!response.ok) throw new Error('Erro ao buscar detalhes da venda.');
            const detalhes = await response.json();

            modalVendaInfoEl.innerHTML = `
                <p class="col-span-2"><strong class="text-zinc-600 dark:text-zinc-400">Cliente:</strong> <span class="text-text-light dark:text-zinc-200">${detalhes.cliente_nome || 'Não identificado'}</span></p>
                <p><strong class="text-zinc-600 dark:text-zinc-400">Vendedor:</strong> <span class="text-text-light dark:text-zinc-200">${detalhes.usuario_nome || 'N/A'}</span></p>
                <p><strong class="text-zinc-600 dark:text-zinc-400">Data:</strong> <span class="text-text-light dark:text-zinc-200">${formatDateTime(detalhes.data_venda)}</span></p>
                <p class="col-span-2 mt-1"><strong class="text-zinc-600 dark:text-zinc-400">Valor Total:</strong> <span class="text-primary font-semibold">${formatCurrency(detalhes.valor_total)}</span></p>
            `;

            modalItensBody.innerHTML = ''; 
            if (detalhes.itens && detalhes.itens.length > 0) {
                detalhes.itens.forEach(item => {
                    const subtotal = (item.quantidade || 0) * (item.preco_unitario || 0);
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-50 dark:hover:bg-zinc-800';
                    tr.innerHTML = `
                        <td class="px-4 py-2 text-text-light dark:text-zinc-200">${item.produto_nome || '?'}</td>
                        <td class="px-4 py-2 text-center text-text-light dark:text-zinc-300">${item.quantidade || 0}</td>
                        <td class="px-4 py-2 text-right text-text-light dark:text-zinc-300">${formatCurrency(item.preco_unitario)}</td>
                        <td class="px-4 py-2 text-right text-text-light dark:text-zinc-300">${formatCurrency(subtotal)}</td>
                    `;
                    modalItensBody.appendChild(tr);
                });
            } else {
                 modalItensBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-zinc-500">Nenhum item encontrado nesta venda.</td></tr>';
            }

             modalPagamentosList.innerHTML = ''; 
             if (detalhes.pagamentos && detalhes.pagamentos.length > 0) {
                  detalhes.pagamentos.forEach(p => {
                       modalPagamentosList.innerHTML += `<p>- ${p.metodo || '?'}: ${formatCurrency(p.valor)}</p>`;
                  });
             } else {
                  modalPagamentosList.innerHTML = '<p class="text-zinc-500">Nenhuma forma de pagamento registrada.</p>';
             }


        } catch (error) {
            console.error('Erro ao abrir detalhes da venda:', error);
            modalVendaInfoEl.innerHTML = `<p class="text-red-500 col-span-2">Erro ao carregar detalhes: ${error.message}</p>`;
            modalItensBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Erro ao carregar itens.</td></tr>';
            modalPagamentosList.innerHTML = '<p class="text-red-500">Erro ao carregar pagamentos.</p>';
        }
    }


    // Cancela uma venda
    async function handleCancelClick(vendaId, buttonElement) {
        if (!confirm(`Tem certeza que deseja cancelar a venda #${vendaId}? O estoque dos produtos será revertido.`)) {
            return;
        }

        buttonElement.disabled = true;
        buttonElement.innerHTML = '<div class="spinner spinner-small inline-block"></div>'; 

        try {
            const response = await fetchWithAuth(`/api/vendas/${vendaId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro desconhecido ao cancelar.');

            alert(data.message || 'Venda cancelada com sucesso!');
             const formData = new FormData(filtrosForm);
             const params = new URLSearchParams(formData).toString();
             await carregarVendas(params ? `?${params}` : '');

        } catch (error) {
            alert(`Erro ao cancelar venda: ${error.message}`);
            buttonElement.disabled = false;
            buttonElement.textContent = 'Cancelar'; 
        }
    }

    // --- NOVA FUNÇÃO: Gerar Relatório de Itens ---
    async function gerarRelatorioItens() {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;

        if (!dataInicio || !dataFim) {
            alert('Por favor, selecione uma Data Início e Data Fim no filtro para gerar o relatório.');
            return;
        }

        const btnOriginalText = btnRelatorioItens.innerHTML;
        btnRelatorioItens.disabled = true;
        btnRelatorioItens.innerHTML = '<div class="spinner spinner-small mr-1 inline-block"></div> Gerando...';

        try {
            const params = new URLSearchParams({ dataInicio, dataFim }).toString();
            const response = await fetchWithAuth(`/api/vendas/relatorio/itens?${params}`);
            
            if (!response.ok) throw new Error('Erro ao buscar dados do relatório.');
            
            const data = await response.json();

            // Preenche o Template Oculto
            document.getElementById('rel-empresa-nome').textContent = "Relatório de Vendas por Item";
            document.getElementById('rel-periodo').textContent = `${formatDateShort(dataInicio)} até ${formatDateShort(dataFim)}`;
            document.getElementById('rel-data-geracao').textContent = new Date().toLocaleString('pt-BR');

            const tbody = document.getElementById('rel-itens-body');
            tbody.innerHTML = '';

            if (data.itens.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center;">Nenhum item vendido neste período.</td></tr>';
            } else {
                data.itens.forEach((item, index) => {
                    const tr = document.createElement('tr');
                    tr.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9';
                    tr.innerHTML = `
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.produto_nome}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.produto_codigo || '-'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.preco_medio)}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantidade_total}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.valor_total_vendido)}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            document.getElementById('rel-total-qtd').textContent = data.totais.qtd;
            document.getElementById('rel-total-valor').textContent = formatCurrency(data.totais.valor);

            const canvas = await html2canvas(relatorioTemplate, { scale: 2, backgroundColor: '#ffffff' });
            
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Relatorio_Itens_${dataInicio}_a_${dataFim}.png`;
            link.click();

        } catch (error) {
            console.error(error);
            alert('Erro ao gerar relatório: ' + error.message);
        } finally {
            btnRelatorioItens.disabled = false;
            btnRelatorioItens.innerHTML = btnOriginalText;
        }
    }

    // --- Event Listeners ---

    // Filtros
    filtrosForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(filtrosForm);
        const params = new URLSearchParams();
         for (const [key, value] of formData.entries()) {
             if (value) { 
                 params.append(key, value);
             }
         }
        carregarVendas(params.toString() ? `?${params.toString()}` : '');
    });

    // Limpar Filtros
    limparFiltrosBtn.addEventListener('click', () => {
        filtrosForm.reset();
        filtroVendedorSelect.value = "";
        carregarVendas(); 
        const detailsElement = filtrosForm.closest('details');
        if (detailsElement) detailsElement.open = false;
    });

    // Relatório
    if (btnRelatorioItens) {
        btnRelatorioItens.addEventListener('click', gerarRelatorioItens);
    }

    // Delegação de Eventos na Lista
    vendasListContainer.addEventListener('click', (event) => {
         const vendaItem = event.target.closest('.venda-item');
         const cancelButton = event.target.closest('.btn-cancelar');

         if (cancelButton && vendaItem && vendaItem.dataset.vendaId) {
             event.stopPropagation(); 
             handleCancelClick(vendaItem.dataset.vendaId, cancelButton);
         } else if (vendaItem && vendaItem.dataset.vendaId) {
            abrirModalDetalhes(vendaItem.dataset.vendaId);
         }
    });

    // Fechar Modal
    closeModalBtns.forEach(button => {
        button.addEventListener('click', () => closeModal(detailsModal));
    });

    detailsModal.addEventListener('click', (event) => {
        if (event.target === detailsModal) {
            closeModal(detailsModal);
        }
    });

    // --- INICIALIZAÇÃO ---
    carregarVendedores(); 
    carregarVendas(); 

});
