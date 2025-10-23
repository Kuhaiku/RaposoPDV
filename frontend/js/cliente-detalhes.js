// Garante que checkAuth e fetchWithAuth estão disponíveis (de auth.js)
if (typeof checkAuth !== 'function' || typeof fetchWithAuth !== 'function') {
    console.error("Funções 'checkAuth' ou 'fetchWithAuth' não encontradas.");
} else {
    checkAuth(); // Verifica login
}

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DO DOM ---
    const nomeClienteHeader = document.getElementById('nome-cliente-header');
    const totalGastoEl = document.getElementById('total-gasto');
    const totalComprasEl = document.getElementById('total-compras');
    const dadosCadastraisEl = document.getElementById('dados-cadastrais');
    const historicoComprasList = document.getElementById('historico-compras-list');
    const historicoPlaceholder = document.getElementById('historico-placeholder');
    const gerarRelatorioBtn = document.getElementById('gerar-relatorio-btn');
    const selecionarTodasCheck = document.getElementById('selecionar-todas');
    const selectAllContainer = document.getElementById('select-all-container'); // Container do checkbox "Selecionar todas"
    const reciboEmpresaNomeRelatorio = document.getElementById('recibo-empresa-nome-relatorio'); // Nome da empresa no template do relatório

    let currentClienteData = null; // Armazena dados do cliente
    let currentVendasData = []; // Armazena dados das vendas detalhadas

    // --- Funções Auxiliares ---
    const formatCurrency = (value) => {
        const number = parseFloat(value) || 0;
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    const formatDateTime = (dataISO) => {
        if (!dataISO) return 'N/A';
        return new Date(dataISO).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };

    // --- Funções Principais ---

    // Gera o relatório PDF/Imagem das vendas selecionadas
    async function gerarRelatorio() {
        const checkboxesMarcadas = historicoComprasList.querySelectorAll('.venda-checkbox:checked');
        if (checkboxesMarcadas.length === 0) {
            alert('Por favor, selecione pelo menos uma venda para gerar o relatório.');
            return;
        }

        // Pega os IDs das vendas selecionadas a partir dos checkboxes marcados
        const vendaIdsSelecionadas = Array.from(checkboxesMarcadas).map(cb => cb.dataset.vendaId);

        gerarRelatorioBtn.disabled = true;
        gerarRelatorioBtn.innerHTML = '<div class="spinner spinner-small mr-1 inline-block"></div> Gerando...';

        try {
            // Filtra os detalhes das vendas já carregadas (currentVendasData)
            // Se currentVendasData não tiver os itens, precisaríamos buscar novamente
            const vendasParaRelatorio = currentVendasData.filter(venda => vendaIdsSelecionadas.includes(String(venda.id)));

            // Preenche o template oculto do recibo/relatório
            document.getElementById('recibo-cliente-nome').textContent = currentClienteData?.nome || 'Cliente';
            // Pega nome da empresa (se disponível, buscar via API se necessário)
            reciboEmpresaNomeRelatorio.textContent = localStorage.getItem('nomeEmpresa') || 'Relatório de Vendas'; // Pega do localStorage ou usa padrão

            const reciboVendasContainer = document.getElementById('recibo-vendas-container');
            reciboVendasContainer.innerHTML = '';
            let totalGeral = 0;

            vendasParaRelatorio.forEach(venda => {
                let itensHtml = '';
                // Assume que venda.itens está disponível. Se não estiver, buscaria aqui.
                if (venda.itens && venda.itens.length > 0) {
                    venda.itens.forEach(item => {
                        const subtotal = (item.quantidade || 0) * (item.preco_unitario || 0);
                        itensHtml += `<tr><td>${item.produto_nome || '?'}</td><td style="text-align: center;">${item.quantidade || 0}</td><td style="text-align: right;">${subtotal.toFixed(2)}</td></tr>`;
                    });
                } else {
                    itensHtml = '<tr><td colspan="3">Nenhum item detalhado.</td></tr>';
                }

                // Adiciona informações de pagamento
                 let pagamentosHtml = '<p style="margin-top: 5px;"><strong>Pagamento:</strong> ';
                 if (venda.pagamentos && venda.pagamentos.length > 0) {
                      pagamentosHtml += venda.pagamentos.map(p => `${p.metodo}: ${formatCurrency(p.valor)}`).join(' / ');
                 } else {
                      pagamentosHtml += 'N/A';
                 }
                 pagamentosHtml += '</p>';


                reciboVendasContainer.innerHTML += `
                    <div class="recibo-info" style="border-top: 2px solid #000; padding-top: 15px; margin-top: 15px;">
                        <p><strong>Venda:</strong> #${venda.id}</p>
                        <p><strong>Data:</strong> ${formatDateTime(venda.data_venda)}</p>
                         ${pagamentosHtml} </div>
                    <table class="recibo-tabela">
                        <thead><tr><th>Item</th><th style="text-align: center;">Qtd.</th><th style="text-align: right;">Subtotal</th></tr></thead>
                        <tbody>${itensHtml}</tbody>
                    </table>
                    <div class="recibo-total" style="font-size: 1rem; border-top: 1px dashed #000;">
                        <strong>TOTAL DA VENDA: ${formatCurrency(venda.valor_total)}</strong>
                    </div>`;
                totalGeral += parseFloat(venda.valor_total || 0);
            });

            document.getElementById('recibo-total-geral').textContent = formatCurrency(totalGeral);
            document.getElementById('recibo-data-geracao').textContent = new Date().toLocaleString('pt-BR');

            // Gera a imagem usando html2canvas
            const elementoRecibo = document.getElementById('recibo-template');
            if (!elementoRecibo) throw new Error("Elemento do template de recibo não encontrado.");

            const canvas = await html2canvas(elementoRecibo, { scale: 2, backgroundColor: '#ffffff', useCORS: true }); // useCORS pode ajudar com imagens externas
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Relatorio_${(currentClienteData?.nome || 'Cliente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
            link.click();

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            alert(`Ocorreu um erro ao gerar o relatório: ${error.message}`);
        } finally {
             gerarRelatorioBtn.disabled = false;
             gerarRelatorioBtn.innerHTML = '<span class="material-symbols-outlined mr-1 text-sm">download</span> Relatório';
        }
    }

    // Carrega os detalhes do cliente e seu histórico
    async function carregarDetalhesCliente() {
        const urlParams = new URLSearchParams(window.location.search);
        const clienteId = urlParams.get('id');
        if (!clienteId) {
            alert('ID do cliente não encontrado na URL.');
            window.location.href = 'clientes.html';
            return;
        }

        historicoPlaceholder.textContent = 'Carregando dados...';
        historicoPlaceholder.classList.remove('hidden');
        historicoComprasList.innerHTML = '';
        currentVendasData = []; // Limpa dados antigos

        try {
            // Busca detalhes do cliente (que inclui histórico resumido)
            const clienteResponse = await fetchWithAuth(`/api/clientes/${clienteId}/detalhes`);
            if (!clienteResponse.ok) {
                const errorData = await clienteResponse.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(errorData.message || `Erro ${clienteResponse.status} ao carregar detalhes.`);
            }
            currentClienteData = await clienteResponse.json(); // Armazena dados do cliente

            // Preenche dados gerais
            nomeClienteHeader.textContent = currentClienteData.nome || 'Cliente sem nome';
            document.title = `Detalhes | ${currentClienteData.nome || 'Cliente'}`;
            totalGastoEl.textContent = formatCurrency(currentClienteData.total_gasto);
            totalComprasEl.textContent = currentClienteData.historico_compras ? currentClienteData.historico_compras.length : 0;

            // Preenche dados cadastrais
            dadosCadastraisEl.innerHTML = `
                <p><strong class="font-medium text-zinc-600 dark:text-zinc-400 block text-xs">Nome:</strong> <span class="text-text-light dark:text-zinc-200">${currentClienteData.nome || 'N/A'}</span></p>
                <p><strong class="font-medium text-zinc-600 dark:text-zinc-400 block text-xs">Telefone:</strong> <span class="text-text-light dark:text-zinc-200">${currentClienteData.telefone || 'N/A'}</span></p>
                <p><strong class="font-medium text-zinc-600 dark:text-zinc-400 block text-xs">CPF:</strong> <span class="text-text-light dark:text-zinc-200">${currentClienteData.cpf || 'N/A'}</span></p>
                <p><strong class="font-medium text-zinc-600 dark:text-zinc-400 block text-xs">Email:</strong> <span class="text-text-light dark:text-zinc-200">${currentClienteData.email || 'N/A'}</span></p>
                <p><strong class="font-medium text-zinc-600 dark:text-zinc-400 block text-xs">Endereço:</strong> <span class="text-text-light dark:text-zinc-200">${[currentClienteData.logradouro, currentClienteData.numero, currentClienteData.bairro, currentClienteData.cidade, currentClienteData.estado, currentClienteData.cep].filter(Boolean).join(', ') || 'N/A'}</span></p>
            `;

            // Preenche histórico de compras
            historicoPlaceholder.classList.add('hidden');
            if (currentClienteData.historico_compras && currentClienteData.historico_compras.length > 0) {
                gerarRelatorioBtn.classList.remove('hidden');
                selectAllContainer.classList.remove('hidden');

                // Busca detalhes completos de CADA venda para ter os itens e pagamentos
                const detalhesPromessas = currentClienteData.historico_compras.map(vendaResumo =>
                     fetchWithAuth(`/api/vendas/${vendaResumo.id}`).then(res => res.ok ? res.json() : Promise.reject(`Erro ${res.status} venda ${vendaResumo.id}`))
                );

                currentVendasData = await Promise.all(detalhesPromessas); // Armazena detalhes completos

                currentVendasData.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda)); // Ordena por data decrescente


                currentVendasData.forEach(venda => {
                    const vendaCard = document.createElement('div');
                    vendaCard.className = 'bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden venda-card border dark:border-zinc-700';
                    vendaCard.dataset.vendaId = venda.id;

                    // Itens (mostra apenas os nomes, por exemplo)
                    let itensPreview = '';
                    if (venda.itens && venda.itens.length > 0) {
                         itensPreview = venda.itens.map(item => `${item.quantidade}x ${item.produto_nome}`).join(', ');
                         if(itensPreview.length > 50) itensPreview = itensPreview.substring(0, 50) + '...'; // Limita tamanho
                    } else {
                         itensPreview = 'Nenhum item detalhado';
                    }

                    // Pagamentos
                    let pagamentosPreview = '';
                    if (venda.pagamentos && venda.pagamentos.length > 0) {
                         pagamentosPreview = venda.pagamentos.map(p => p.metodo).join(' / ');
                    } else {
                         pagamentosPreview = 'N/A';
                    }


                    vendaCard.innerHTML = `
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                 <input type="checkbox" class="venda-checkbox form-checkbox rounded text-primary focus:ring-primary/50 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-700" data-venda-id="${venda.id}">
                                <p class="text-sm font-semibold text-text-light dark:text-text-dark">Pedido #${venda.id}</p>
                            </div>
                            <p class="text-xs text-subtext-light dark:text-subtext-dark">${formatDateTime(venda.data_venda)}</p>
                        </div>
                        <div class="p-4 space-y-2">
                            <div class="text-xs">
                                <span class="font-medium text-zinc-500 dark:text-zinc-400">Itens:</span>
                                <span class="text-text-light dark:text-zinc-300 ml-1">${itensPreview}</span>
                            </div>
                            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <div class="flex justify-between items-center text-sm">
                                <span class="font-medium text-subtext-light dark:text-subtext-dark">Pagamento:</span>
                                <span class="font-semibold text-text-light dark:text-zinc-200">${pagamentosPreview}</span>
                            </div>
                            <div class="flex justify-between items-center mt-1">
                                <span class="text-sm font-bold text-subtext-light dark:text-subtext-dark">Total:</span>
                                <span class="text-sm font-bold text-primary">${formatCurrency(venda.valor_total)}</span>
                            </div>
                        </div>
                    `;
                    historicoComprasList.appendChild(vendaCard);
                });
            } else {
                gerarRelatorioBtn.classList.add('hidden');
                selectAllContainer.classList.add('hidden');
                historicoComprasList.innerHTML = '<p class="text-center py-6 text-zinc-500 dark:text-zinc-400">Nenhuma compra registrada para este cliente.</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do cliente:', error);
            historicoPlaceholder.textContent = `Erro: ${error.message}`;
            historicoPlaceholder.classList.remove('hidden');
            alert(`Não foi possível carregar os detalhes: ${error.message}`);
            // Limpa dados parciais em caso de erro
            nomeClienteHeader.textContent = 'Erro';
            totalGastoEl.textContent = 'Erro';
            totalComprasEl.textContent = 'Erro';
            dadosCadastraisEl.innerHTML = '<p class="text-red-500">Falha ao carregar dados.</p>';

        }
    }

    // --- EVENT LISTENERS ---
    gerarRelatorioBtn.addEventListener('click', gerarRelatorio);

    selecionarTodasCheck.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        historicoComprasList.querySelectorAll('.venda-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });
    });

     historicoComprasList.addEventListener('change', (event) => {
         if (event.target.classList.contains('venda-checkbox') && !event.target.checked) {
             selecionarTodasCheck.checked = false;
         } else if (event.target.classList.contains('venda-checkbox') && event.target.checked) {
             // Opcional: Marcar "Selecionar todas" se todas individuais estiverem marcadas
             const allCheckboxes = historicoComprasList.querySelectorAll('.venda-checkbox');
             const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
             selecionarTodasCheck.checked = allChecked;
         }
     });

    // --- Inicialização ---
    carregarDetalhesCliente();

}); // Fim do DOMContentLoaded
