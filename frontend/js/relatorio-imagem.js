// frontend/js/relatorio-imagem.js

// Verifica autenticação
if (typeof checkAuth !== 'function') {
    console.error("Auth não carregado");
} else {
    checkAuth();
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos ---
    const filtroForm = document.getElementById('filtro-form');
    const listaVendasBody = document.getElementById('lista-vendas-body');
    const selectAllCheckbox = document.getElementById('select-all');
    const btnGerarImagem = document.getElementById('btn-gerar-imagem');
    const logoutBtn = document.getElementById('logout-btn');

    // Template Elements
    const renderContainer = document.getElementById('relatorio-render-container');
    const renderNomeEmpresa = document.getElementById('render-nome-empresa');
    const renderInfoEmpresa = document.getElementById('render-info-empresa');
    const renderVendasLista = document.getElementById('render-vendas-lista');
    const renderTotalGeral = document.getElementById('render-total-geral');
    const renderDataGeracao = document.getElementById('render-data-geracao');

    let vendasCarregadas = []; // Lista resumida da busca
    let dadosEmpresa = null;

    // --- Funções Auxiliares ---
    const formatCurrency = (val) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (iso) => new Date(iso).toLocaleString('pt-BR');

    // --- 1. Carregar Dados da Empresa (para o cabeçalho) ---
    async function carregarDadosEmpresa() {
        try {
            const res = await fetchWithAuth('/api/empresas/meus-dados');
            if(res.ok) {
                dadosEmpresa = await res.json();
                renderNomeEmpresa.textContent = dadosEmpresa.nome_empresa || 'Minha Empresa';
                renderInfoEmpresa.textContent = `${dadosEmpresa.endereco_comercial || ''} ${dadosEmpresa.telefone_comercial ? '- Tel: ' + dadosEmpresa.telefone_comercial : ''}`;
            }
        } catch (e) {
            console.warn("Não foi possível carregar dados da empresa");
        }
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

        listaVendasBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Buscando...</td></tr>';
        
        try {
            const response = await fetchWithAuth(`/api/vendas?${params.toString()}`);
            if (!response.ok) throw new Error("Erro ao buscar vendas");
            
            vendasCarregadas = await response.json();
            renderizarTabela(vendasCarregadas);
        } catch (error) {
            listaVendasBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">${error.message}</td></tr>`;
        }
    });

    function renderizarTabela(vendas) {
        listaVendasBody.innerHTML = '';
        if (vendas.length === 0) {
            listaVendasBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Nenhuma venda encontrada.</td></tr>';
            return;
        }

        vendas.forEach(venda => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 dark:hover:bg-zinc-800 border-b dark:border-zinc-700";
            tr.innerHTML = `
                <td class="p-3"><input type="checkbox" class="venda-checkbox w-5 h-5 text-primary rounded" value="${venda.id}"></td>
                <td class="p-3 font-mono text-xs text-gray-500">#${venda.id}</td>
                <td class="p-3">${formatDate(venda.data_venda)}</td>
                <td class="p-3">${venda.cliente_nome || 'Consumidor Final'}</td>
                <td class="p-3 text-right font-bold text-primary">${formatCurrency(venda.valor_total)}</td>
            `;
            // Clique na linha marca o checkbox
            tr.addEventListener('click', (e) => {
                if(e.target.type !== 'checkbox') {
                    const chk = tr.querySelector('.venda-checkbox');
                    chk.checked = !chk.checked;
                }
            });
            listaVendasBody.appendChild(tr);
        });
    }

    // --- 3. Selecionar Todos ---
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.venda-checkbox');
        checkboxes.forEach(chk => chk.checked = e.target.checked);
    });

    // --- 4. Gerar Imagem ---
    btnGerarImagem.addEventListener('click', async () => {
        const selecionados = Array.from(document.querySelectorAll('.venda-checkbox:checked')).map(cb => cb.value);
        
        if (selecionados.length === 0) {
            alert("Selecione pelo menos uma venda.");
            return;
        }

        const btnOriginal = btnGerarImagem.innerHTML;
        btnGerarImagem.disabled = true;
        btnGerarImagem.innerHTML = `<span class="spinner inline-block mr-2"></span> Processando ${selecionados.length} vendas...`;

        try {
            // 1. Buscar detalhes completos de cada venda selecionada (pois a lista só tem resumo)
            const promessas = selecionados.map(id => fetchWithAuth(`/api/vendas/${id}`).then(r => r.json()));
            const vendasDetalhadas = await Promise.all(promessas);

            // 2. Preencher o container oculto HTML
            renderVendasLista.innerHTML = '';
            let totalAcumulado = 0;
            renderDataGeracao.textContent = new Date().toLocaleString('pt-BR');

            vendasDetalhadas.forEach(venda => {
                totalAcumulado += parseFloat(venda.valor_total);
                
                // Monta itens
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
                            </tr>
                        `;
                    });
                }

                // Monta Pagamentos
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
                    </div>
                `;
                renderVendasLista.innerHTML += vendaHTML;
            });

            renderTotalGeral.textContent = formatCurrency(totalAcumulado);

            // 3. Gerar a imagem usando dom-to-image
            // Usa toPng para garantir transparência correta se necessário, ou toJpeg
            const dataUrl = await domtoimage.toPng(renderContainer, {
                bgcolor: '#ffffff', // Garante fundo branco
                quality: 1
            });

            // 4. Download
            const link = document.createElement('a');
            link.download = `Relatorio_Vendas_${new Date().toISOString().slice(0,10)}.png`;
            link.href = dataUrl;
            link.click();

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar imagem: " + error.message);
        } finally {
            btnGerarImagem.disabled = false;
            btnGerarImagem.innerHTML = btnOriginal;
        }
    });

    if(logoutBtn) logoutBtn.addEventListener('click', logout);

    // Inicialização
    carregarDadosEmpresa();
});
