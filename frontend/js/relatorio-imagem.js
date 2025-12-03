// frontend/js/relatorio-imagem.js

if (typeof checkAuth !== 'function') { console.error("Auth não carregado"); } else { checkAuth(); }

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const filtroForm = document.getElementById('filtro-form');
    const vendasListContainer = document.getElementById('vendas-list-container');
    const vendasListPlaceholder = document.getElementById('vendas-list-placeholder');
    const selectAllCheckbox = document.getElementById('select-all');
    const contadorSelecionados = document.getElementById('contador-selecionados');
    const btnGerarImagem = document.getElementById('btn-gerar-imagem');
    const btnGerarPDF = document.getElementById('btn-gerar-pdf');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Template Elements (Image Only) ---
    const renderContainer = document.getElementById('relatorio-render-container');
    const renderNomeEmpresa = document.getElementById('render-nome-empresa');
    const renderInfoEmpresa = document.getElementById('render-info-empresa');
    const renderVendasLista = document.getElementById('render-vendas-lista');
    const renderTotalGeral = document.getElementById('render-total-geral');
    const renderDataGeracao = document.getElementById('render-data-geracao');

    let vendasCarregadas = []; 
    let dadosEmpresa = null;

    // --- Helpers ---
    const formatCurrency = (val) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (iso) => new Date(iso).toLocaleString('pt-BR');

    // 1. Carregar Empresa
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

    // 2. Carregar Vendas
    async function carregarVendas(event = null) {
        if (event) event.preventDefault();

        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        const cliente = document.getElementById('filtro-cliente').value;

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
    }

    filtroForm.addEventListener('submit', carregarVendas);

    // 3. Renderizar Lista
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
            div.className = 'bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors select-none mb-3';
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
                </div>`;
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
        const isChecked = e.target.checked;
        document.querySelectorAll('.venda-checkbox').forEach(chk => chk.checked = isChecked);
        atualizarContador();
    });

    function atualizarContador() {
        const count = document.querySelectorAll('.venda-checkbox:checked').length;
        contadorSelecionados.textContent = `${count} selecionados`;
    }

    // --- FUNÇÃO CENTRAL DE GERAÇÃO ---
    async function processarRelatorio(tipo) {
        const selecionados = Array.from(document.querySelectorAll('.venda-checkbox:checked')).map(cb => cb.value);
        if (selecionados.length === 0) { alert("Selecione pelo menos uma venda."); return; }

        const botao = tipo === 'pdf' ? btnGerarPDF : btnGerarImagem;
        const htmlOriginal = botao.innerHTML;
        
        btnGerarImagem.disabled = true;
        btnGerarPDF.disabled = true;
        botao.innerHTML = `<div class="spinner"></div>`;

        try {
            // Busca Detalhes
            const promessas = selecionados.map(id => fetchWithAuth(`/api/vendas/${id}`).then(r => r.json()));
            const vendasDetalhadas = await Promise.all(promessas);

            const dataGeracao = new Date().toLocaleString('pt-BR');
            let totalAcumulado = 0;

            // =======================================================
            // OPÇÃO 1: GERAR PDF (NATIVO, LEVE, A4)
            // =======================================================
            if (tipo === 'pdf') {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ format: 'a4', unit: 'mm' }); // Formato A4 explícito

                // Cabeçalho
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text(dadosEmpresa?.nome_empresa || 'MINHA EMPRESA', 105, 15, { align: 'center' });
                
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.text(`Data de Emissão: ${dataGeracao}`, 105, 20, { align: 'center' });
                doc.line(10, 23, 200, 23);

                let finalY = 28;

                // Loop Vendas
                vendasDetalhadas.forEach((venda) => {
                    totalAcumulado += parseFloat(venda.valor_total);

                    // Dados da Venda (Campos Solicitados)
                    // Venda ID, Cliente Nome
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Venda #${venda.id}`, 14, finalY);
                    
                    doc.setFont("helvetica", "normal");
                    doc.text(`Cliente: ${venda.cliente_nome || 'Consumidor Final'}`, 14, finalY + 5);

                    // Tabela de Itens (Item, Qtd, Valor Unitário, Total)
                    const itemsData = venda.itens ? venda.itens.map(item => [
                        item.produto_nome,
                        item.quantidade,
                        formatCurrency(item.preco_unitario),
                        formatCurrency(item.quantidade * item.preco_unitario)
                    ]) : [];

                    if(itemsData.length === 0) itemsData.push(['Sem itens', '-', '-', '-']);

                    doc.autoTable({
                        startY: finalY + 7,
                        head: [['Item', 'Qtd', 'Unit.', 'Total']],
                        body: itemsData,
                        theme: 'plain', // Tema limpo para economizar tinta
                        styles: { fontSize: 9, cellPadding: 1 },
                        headStyles: { fontStyle: 'bold', fillColor: [220, 220, 220] },
                        columnStyles: {
                            0: { cellWidth: 'auto' }, // Item
                            1: { cellWidth: 15, halign: 'center' }, // Qtd
                            2: { cellWidth: 25, halign: 'right' }, // Unit
                            3: { cellWidth: 25, halign: 'right' }  // Total
                        },
                        margin: { left: 14, right: 14 }
                    });

                    finalY = doc.lastAutoTable.finalY + 5;

                    // Total da Compra
                    doc.setFont("helvetica", "bold");
                    doc.text(`Total da Compra: ${formatCurrency(venda.valor_total)}`, 196, finalY, { align: 'right' });
                    
                    // Linha separadora
                    finalY += 8;
                    doc.setLineWidth(0.1);
                    doc.line(14, finalY, 196, finalY);
                    finalY += 8;

                    // Nova página se necessário
                    if (finalY > 270) {
                        doc.addPage();
                        finalY = 20;
                    }
                });

                // Total Geral (Fim do Documento)
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`TOTAL GERAL: ${formatCurrency(totalAcumulado)}`, 196, finalY + 5, { align: 'right' });

                doc.save(`Relatorio_A4_${new Date().toISOString().slice(0,10)}.pdf`);
            } 
            
            // =======================================================
            // OPÇÃO 2: GERAR IMAGEM (ESTILO CUPOM VISUAL)
            // =======================================================
            else if (tipo === 'image') {
                renderVendasLista.innerHTML = '';
                renderDataGeracao.textContent = dataGeracao;

                vendasDetalhadas.forEach(venda => {
                    totalAcumulado += parseFloat(venda.valor_total);
                    
                    let linhasItens = '';
                    if(venda.itens) {
                        venda.itens.forEach(item => {
                            linhasItens += `<tr><td>${item.produto_nome}</td><td class="rel-text-center">${item.quantidade}</td><td class="rel-text-right">${formatCurrency(item.preco_unitario)}</td><td class="rel-text-right">${formatCurrency(item.quantidade * item.preco_unitario)}</td></tr>`;
                        });
                    }

                    renderVendasLista.innerHTML += `
                        <div class="rel-venda-card">
                            <div class="rel-venda-header"><span>Venda #${venda.id}</span><span></span></div>
                            <div style="margin-bottom: 8px;"><strong>Cliente:</strong> ${venda.cliente_nome || 'Consumidor Final'}</div>
                            <table class="rel-table"><thead><tr><th>Item</th><th class="rel-text-center">Qtd</th><th class="rel-text-right">Unit.</th><th class="rel-text-right">Total</th></tr></thead><tbody>${linhasItens}</tbody></table>
                            <div class="rel-text-right" style="margin-top: 8px; font-weight:bold;">Total da Compra: ${formatCurrency(venda.valor_total)}</div>
                        </div>`;
                });
                renderTotalGeral.textContent = formatCurrency(totalAcumulado);

                const canvas = await html2canvas(renderContainer, {
                    scale: 4, // Alta qualidade
                    backgroundColor: "#ffffff",
                    onclone: (doc) => {
                        const el = doc.getElementById('relatorio-render-container');
                        if(el) { el.style.display = 'block'; el.style.position = 'static'; el.style.left = '0'; el.style.top = '0'; }
                    }
                });
                const link = document.createElement('a');
                link.download = `Relatorio_Imagem_${new Date().toISOString().slice(0,10)}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            }

        } catch (error) {
            console.error(error);
            alert(`Erro ao gerar ${tipo.toUpperCase()}: ${error.message}`);
        } finally {
            btnGerarImagem.disabled = false;
            btnGerarPDF.disabled = false;
            botao.innerHTML = htmlOriginal;
        }
    }

    btnGerarImagem.addEventListener('click', () => processarRelatorio('image'));
    btnGerarPDF.addEventListener('click', () => processarRelatorio('pdf'));

    if(logoutBtn) logoutBtn.addEventListener('click', logout);
    carregarDadosEmpresa();
    carregarVendas();
});
