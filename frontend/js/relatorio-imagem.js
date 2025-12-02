// frontend/js/relatorio-imagem.js

// Verifica autenticação
if (typeof checkAuth !== 'function') { console.error("Auth não carregado"); } else { checkAuth(); }

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos DOM ---
    const filtroForm = document.getElementById('filtro-form');
    const vendasListContainer = document.getElementById('vendas-list-container');
    const vendasListPlaceholder = document.getElementById('vendas-list-placeholder');
    const selectAllCheckbox = document.getElementById('select-all');
    const contadorSelecionados = document.getElementById('contador-selecionados');
    const btnGerarImagem = document.getElementById('btn-gerar-imagem');
    const logoutBtn = document.getElementById('logout-btn'); // Caso exista na sidebar em desktops

    // --- Elementos do Template de Relatório ---
    const renderContainer = document.getElementById('relatorio-render-container');
    const renderNomeEmpresa = document.getElementById('render-nome-empresa');
    const renderInfoEmpresa = document.getElementById('render-info-empresa');
    const renderVendasLista = document.getElementById('render-vendas-lista');
    const renderTotalGeral = document.getElementById('render-total-geral');
    const renderDataGeracao = document.getElementById('render-data-geracao');

    // --- Estado ---
    let vendasCarregadas = []; 
    let dadosEmpresa = null;

    // --- Formatadores ---
    const formatCurrency = (val) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (iso) => new Date(iso).toLocaleString('pt-BR');
    const formatDateShort = (iso) => new Date(iso).toLocaleDateString('pt-BR');

    // 1. Carregar Dados da Empresa (para o cabeçalho do relatório)
    async function carregarDadosEmpresa() {
        try {
            const res = await fetchWithAuth('/api/empresas/meus-dados');
            if(res.ok) {
                dadosEmpresa = await res.json();
                renderNomeEmpresa.textContent = (dadosEmpresa.nome_empresa || 'Minha Empresa').toUpperCase();
                renderInfoEmpresa.textContent = `${dadosEmpresa.endereco_comercial || ''} ${dadosEmpresa.telefone_comercial ? ' - ' + dadosEmpresa.telefone_comercial : ''}`;
            }
        } catch (e) { console.warn("Erro ao carregar empresa"); }
    }

    // 2. Buscar Vendas
    filtroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        const cliente = document.getElementById('filtro-cliente').value;

        // Limpa lista e mostra loading
        vendasListContainer.innerHTML = '';
        vendasListPlaceholder.textContent = 'Carregando...';
        vendasListPlaceholder.classList.remove('hidden');
        vendasListContainer.appendChild(vendasListPlaceholder);
        selectAllCheckbox.checked = false;
        atualizarContador();

        const params = new URLSearchParams();
        if (dataInicio) params.append('dataInicio', dataInicio);
        if (dataFim) params.append('dataFim', dataFim);
        if (cliente) params.append('cliente', cliente);

        try {
            const response = await fetchWithAuth(`/api/vendas?${params.toString()}`);
            if (!response.ok) throw new Error("Erro ao buscar vendas");
            
            vendasCarregadas = await response.json();
            renderizarLista(vendasCarregadas);
        } catch (error) {
            vendasListPlaceholder.textContent = `Erro: ${error.message}`;
        }
    });

    // 3. Renderizar Lista (Visual idêntico ao Historico)
    function renderizarLista(vendas) {
        vendasListContainer.innerHTML = '';
        
        if (vendas.length === 0) {
            vendasListPlaceholder.textContent = 'Nenhuma venda encontrada.';
            vendasListContainer.appendChild(vendasListPlaceholder);
            vendasListPlaceholder.classList.remove('hidden');
            return;
        }
        vendasListPlaceholder.classList.add('hidden');

        vendas.forEach(venda => {
            const div = document.createElement('div');
            // Classes copiadas do estilo do histórico.html / painel.html
            div.className = 'bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors select-none';
            
            div.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden w-full">
                    <input type="checkbox" class="venda-checkbox form-checkbox rounded text-primary focus:ring-primary/50 h-5 w-5 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer flex-shrink-0" value="${venda.id}">
                    
                    <div class="flex flex-col min-w-0 flex-1">
                        <div class="flex justify-between items-center w-full">
                            <p class="font-medium text-text-light dark:text-text-dark truncate mr-2">${venda.cliente_nome || 'Consumidor Final'}</p>
                            <p class="font-bold text-primary whitespace-nowrap">${formatCurrency(venda.valor_total)}</p>
                        </div>
                        <p class="text-xs text-subtext-light dark:text-subtext-dark mt-1">#${venda.id} • ${formatDate(venda.data_venda)}</p>
                    </div>
                </div>
            `;

            // Clique no card marca o checkbox
            div.addEventListener('click', (e) => {
                if(e.target.type !== 'checkbox') {
                    const cb = div.querySelector('.venda-checkbox');
                    cb.checked = !cb.checked;
                    atualizarContador();
                }
            });
            
            div.querySelector('.venda-checkbox').addEventListener('change', atualizarContador);
            vendasListContainer.appendChild(div);
        });
        atualizarContador();
    }

    // 4. Selecionar Todos
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.venda-checkbox');
        checkboxes.forEach(chk => chk.checked = e.target.checked);
        atualizarContador();
    });

    function atualizarContador() {
        const count = document.querySelectorAll('.venda-checkbox:checked').length;
        contadorSelecionados.textContent = `${count} selecionados`;
    }

    // 5. Gerar Imagem com HTML2CANVAS
    btnGerarImagem.addEventListener('click', async () => {
        const selecionados = Array.from(document.querySelectorAll('.venda-checkbox:checked')).map(cb => cb.value);
        
        if (selecionados.length === 0) {
            alert("Selecione pelo menos uma venda.");
            return;
        }

        // Estado de Loading
        const btnOriginalHtml = btnGerarImagem.innerHTML;
        btnGerarImagem.disabled = true;
        btnGerarImagem.innerHTML = `<div class="spinner"></div>`; 

        try {
            // A. Buscar Detalhes Completos (para pegar os itens de cada venda)
            // É necessário porque a lista principal só tem o resumo
            const promessas = selecionados.map(id => fetchWithAuth(`/api/vendas/${id}`).then(r => r.json()));
            const vendasDetalhadas = await Promise.all(promessas);

            // B. Preencher o HTML Oculto
            renderVendasLista.innerHTML = '';
            let totalAcumulado = 0;
            renderDataGeracao.textContent = new Date().toLocaleString('pt-BR');

            vendasDetalhadas.forEach(venda => {
                totalAcumulado += parseFloat(venda.valor_total);
                
                // Monta tabela de itens
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
                } else {
                    linhasItens = '<tr><td colspan="4" class="rel-text-center">- Sem itens registrados -</td></tr>';
                }

                // Monta info de pagamentos
                let infoPagamento = '';
                if(venda.pagamentos && venda.pagamentos.length > 0) {
                    const pags = venda.pagamentos.map(p => `${p.metodo} (${formatCurrency(p.valor)})`).join(', ');
                    infoPagamento = `<p style="margin: 5px 0 0 0; font-size: 0.8rem; font-style:italic;">Pagamento: ${pags}</p>`;
                }

                // Cria o card HTML para impressão
                const vendaHTML = `
                    <div class="rel-venda-card">
                        <div class="rel-venda-header">
                            <span>Venda #${venda.id}</span>
                            <span>${formatDate(venda.data_venda)}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>Cliente:</strong> ${venda.cliente_nome || 'Consumidor Final'}<br>
                            ${venda.usuario_nome ? `<strong>Vendedor:</strong> ${venda.usuario_nome}` : ''}
                        </div>
                        <table class="rel-table">
                            <thead><tr><th>Item</th><th class="rel-text-center">Qtd</th><th class="rel-text-right">Unit.</th><th class="rel-text-right">Total</th></tr></thead>
                            <tbody>${linhasItens}</tbody>
                        </table>
                        ${infoPagamento}
                        <div class="rel-text-right" style="margin-top: 8px; font-weight:bold; font-size: 1.1rem;">
                            Total: ${formatCurrency(venda.valor_total)}
                        </div>
                    </div>`;
                renderVendasLista.innerHTML += vendaHTML;
            });

            renderTotalGeral.textContent = formatCurrency(totalAcumulado);

            // C. Usar HTML2CANVAS
            // scale: 2 garante alta resolução (como Retina display)
            const canvas = await html2canvas(renderContainer, {
                scale: 2,
                backgroundColor: "#ffffff", // Fundo branco explícito
                useCORS: true // Permite carregar imagens externas se houver
            });

            // D. Download
            const link = document.createElement('a');
            link.download = `Relatorio_Vendas_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar imagem: " + error.message);
        } finally {
            // Restaura botão
            btnGerarImagem.disabled = false;
            btnGerarImagem.innerHTML = btnOriginalHtml;
        }
    });

    if(logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Inicialização
    carregarDadosEmpresa();
});
