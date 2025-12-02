// frontend/js/relatorio-imagem.js

// Verifica autenticação
if (typeof checkAuth !== 'function') { console.error("Auth não carregado"); } else { checkAuth(); }

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos ---
    const filtroForm = document.getElementById('filtro-form');
    const vendasListContainer = document.getElementById('vendas-list-container');
    const vendasListPlaceholder = document.getElementById('vendas-list-placeholder');
    const selectAllCheckbox = document.getElementById('select-all');
    const contadorSelecionados = document.getElementById('contador-selecionados');
    const btnGerarImagem = document.getElementById('btn-gerar-imagem');
    const logoutBtn = document.getElementById('logout-btn');

    // Template Elements
    const renderContainer = document.getElementById('relatorio-render-container');
    const renderNomeEmpresa = document.getElementById('render-nome-empresa');
    const renderInfoEmpresa = document.getElementById('render-info-empresa');
    const renderVendasLista = document.getElementById('render-vendas-lista');
    const renderTotalGeral = document.getElementById('render-total-geral');
    const renderDataGeracao = document.getElementById('render-data-geracao');

    let vendasCarregadas = []; 
    let dadosEmpresa = null;

    // --- Funções Auxiliares ---
    const formatCurrency = (val) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (iso) => new Date(iso).toLocaleString('pt-BR');
    const formatDateShort = (iso) => new Date(iso).toLocaleDateString('pt-BR');

    // --- 1. Carregar Dados da Empresa ---
    async function carregarDadosEmpresa() {
        try {
            const res = await fetchWithAuth('/api/empresas/meus-dados');
            if(res.ok) {
                dadosEmpresa = await res.json();
                renderNomeEmpresa.textContent = dadosEmpresa.nome_empresa || 'Minha Empresa';
                renderInfoEmpresa.textContent = `${dadosEmpresa.endereco_comercial || ''} ${dadosEmpresa.telefone_comercial ? '- ' + dadosEmpresa.telefone_comercial : ''}`;
            }
        } catch (e) { console.warn("Erro ao carregar empresa"); }
    }

    // --- 2. Buscar Vendas ---
    filtroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        const cliente = document.getElementById('filtro-cliente').value;

        const params = new URLSearchParams();
        if (dataInicio) params.append('dataInicio', dataInicio);
        if (dataFim) params.append('dataFim', dataFim);
        if (cliente) params.append('cliente', cliente);

        vendasListPlaceholder.textContent = 'Carregando...';
        vendasListPlaceholder.classList.remove('hidden');
        vendasListContainer.innerHTML = '';
        vendasListContainer.appendChild(vendasListPlaceholder);
        
        try {
            const response = await fetchWithAuth(`/api/vendas?${params.toString()}`);
            if (!response.ok) throw new Error("Erro ao buscar vendas");
            
            vendasCarregadas = await response.json();
            renderizarLista(vendasCarregadas);
        } catch (error) {
            vendasListPlaceholder.textContent = `Erro: ${error.message}`;
        }
    });

    function renderizarLista(vendas) {
        vendasListContainer.innerHTML = '';
        if (vendas.length === 0) {
            vendasListPlaceholder.textContent = 'Nenhuma venda encontrada.';
            vendasListContainer.appendChild(vendasListPlaceholder);
            vendasListPlaceholder.classList.remove('hidden');
            return;
        }
        vendasListPlaceholder.classList.add('hidden');

        // Renderiza cada venda como um CARD igual ao histórico
        vendas.forEach(venda => {
            const div = document.createElement('div');
            // Estilo copiado do card de venda do histórico/painel
            div.className = 'bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors';
            
            div.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    <input type="checkbox" class="venda-checkbox form-checkbox rounded text-primary focus:ring-primary/50 h-5 w-5 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer" value="${venda.id}">
                    <div class="flex flex-col min-w-0">
                        <p class="font-medium text-text-light dark:text-text-dark truncate">${venda.cliente_nome || 'Consumidor Final'}</p>
                        <p class="text-xs text-subtext-light dark:text-subtext-dark">#${venda.id} - ${formatDate(venda.data_venda)}</p>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="font-bold text-primary">${formatCurrency(venda.valor_total)}</p>
                </div>
            `;

            // Ao clicar no card (fora do checkbox), marca o checkbox
            div.addEventListener('click', (e) => {
                if(e.target.type !== 'checkbox') {
                    const cb = div.querySelector('.venda-checkbox');
                    cb.checked = !cb.checked;
                    atualizarContador();
                }
            });
            
            // Listener para atualizar contador ao clicar direto no checkbox
            div.querySelector('.venda-checkbox').addEventListener('change', atualizarContador);

            vendasListContainer.appendChild(div);
        });
        atualizarContador();
    }

    // --- 3. Selecionar Todos ---
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.venda-checkbox');
        checkboxes.forEach(chk => chk.checked = e.target.checked);
        atualizarContador();
    });

    function atualizarContador() {
        const count = document.querySelectorAll('.venda-checkbox:checked').length;
        contadorSelecionados.textContent = `${count} selecionados`;
    }

    // --- 4. Gerar Imagem ---
    btnGerarImagem.addEventListener('click', async () => {
        const selecionados = Array.from(document.querySelectorAll('.venda-checkbox:checked')).map(cb => cb.value);
        
        if (selecionados.length === 0) {
            alert("Selecione pelo menos uma venda.");
            return;
        }

        const btnOriginal = btnGerarImagem.innerHTML;
        btnGerarImagem.disabled = true;
        btnGerarImagem.innerHTML = `<span class="spinner inline-block"></span>`;

        try {
            // Busca detalhes completos
            const promessas = selecionados.map(id => fetchWithAuth(`/api/vendas/${id}`).then(r => r.json()));
            const vendasDetalhadas = await Promise.all(promessas);

            // Preenche o template
            renderVendasLista.innerHTML = '';
            let totalAcumulado = 0;
            renderDataGeracao.textContent = new Date().toLocaleString('pt-BR');

            vendasDetalhadas.forEach(venda => {
                totalAcumulado += parseFloat(venda.valor_total);
                
                let linhasItens = '';
                if(venda.itens && venda.itens.length > 0) {
                    venda.itens.forEach(item => {
                        const subtotal = item.quantidade * item.preco_unitario;
                        linhasItens += `
                            <tr>
                                <td>${item.produto_nome}</td>
                                <td class="rel-text-center">${item.quantidade}</td>
                                <td class="rel-text-right">${formatCurrency(item.preco_unitario)}</td>
                                <td class="rel-text-right">${formatCurrency(subtotal)}</td>
                            </tr>`;
                    });
                }

                let infoPagamento = '';
                if(venda.pagamentos && venda.pagamentos.length > 0) {
                    const pags = venda.pagamentos.map(p => `${p.metodo} (${formatCurrency(p.valor)})`).join(', ');
                    infoPagamento = `<p style="margin: 5px 0 0 0; font-size: 0.8rem;"><i>Pagamento: ${pags}</i></p>`;
                }

                const vendaHTML = `
                    <div class="rel-venda-card">
                        <div class="rel-venda-header">
                            <span>Venda #${venda.id}</span>
                            <span>${formatDate(venda.data_venda)}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>Cliente:</strong> ${venda.cliente_nome || 'N/A'}<br>
                            <strong>Vendedor:</strong> ${venda.usuario_nome || 'N/A'}
                        </div>
                        <table class="rel-table">
                            <thead><tr><th>Item</th><th class="rel-text-center">Qtd</th><th class="rel-text-right">Unit.</th><th class="rel-text-right">Total</th></tr></thead>
                            <tbody>${linhasItens}</tbody>
                        </table>
                        ${infoPagamento}
                        <div class="rel-text-right" style="margin-top: 5px; font-weight:bold;">
                            Total Venda: ${formatCurrency(venda.valor_total)}
                        </div>
                    </div>`;
                renderVendasLista.innerHTML += vendaHTML;
            });

            renderTotalGeral.textContent = formatCurrency(totalAcumulado);

            // Gera a imagem
            const dataUrl = await domtoimage.toPng(renderContainer, {
                bgcolor: '#ffffff',
                quality: 1
            });

            // Download
            const link = document.createElement('a');
            link.download = `Relatorio_${new Date().toISOString().slice(0,10)}.png`;
            link.href = dataUrl;
            link.click();

        } catch (error) {
            alert("Erro ao gerar imagem: " + error.message);
        } finally {
            btnGerarImagem.disabled = false;
            btnGerarImagem.innerHTML = btnOriginal;
        }
    });

    if(logoutBtn) logoutBtn.addEventListener('click', logout);
    carregarDadosEmpresa();
});
