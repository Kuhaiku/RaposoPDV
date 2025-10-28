// Gera o relatório PDF/Imagem das vendas selecionadas
    async function gerarRelatorio() {
        const checkboxesMarcadas = historicoComprasList.querySelectorAll('.venda-checkbox:checked');
        if (checkboxesMarcadas.length === 0) {
            alert('Por favor, selecione pelo menos uma venda para gerar o relatório.');
            return;
        }

        const vendaIdsSelecionadas = Array.from(checkboxesMarcadas).map(cb => cb.dataset.vendaId);

        gerarRelatorioBtn.disabled = true;
        gerarRelatorioBtn.innerHTML = '<div class="spinner spinner-small mr-1 inline-block"></div> Gerando...';

        try {
            const vendasParaRelatorio = currentVendasData.filter(venda => vendaIdsSelecionadas.includes(String(venda.id)));

            // --- Seleciona os elementos do template ---
            const clienteNomeEl = document.getElementById('recibo-cliente-nome');
            const empresaNomeEl = document.getElementById('recibo-empresa-nome-relatorio');
            const vendasContainerEl = document.getElementById('recibo-vendas-container');
            const totalGeralEl = document.getElementById('recibo-total-geral');
            const dataGeracaoEl = document.getElementById('recibo-data-geracao'); // <= Elemento que causava o erro
            const elementoRecibo = document.getElementById('recibo-template');

            // --- Verificações de segurança ---
            if (!clienteNomeEl || !empresaNomeEl || !vendasContainerEl || !totalGeralEl || !dataGeracaoEl || !elementoRecibo) {
                console.error("Um ou mais elementos do template de recibo não foram encontrados no DOM:", {
                    clienteNomeEl, empresaNomeEl, vendasContainerEl, totalGeralEl, dataGeracaoEl, elementoRecibo
                });
                throw new Error("Erro ao encontrar elementos do template de recibo. Verifique o HTML.");
            }
            // --- Fim Verificações ---

            clienteNomeEl.textContent = currentClienteData?.nome || 'Cliente';
            empresaNomeEl.textContent = localStorage.getItem('nomeEmpresa') || 'Relatório de Vendas';

            vendasContainerEl.innerHTML = '';
            let totalGeral = 0;

            vendasParaRelatorio.forEach(venda => {
                let itensHtml = '';
                if (venda.itens && venda.itens.length > 0) {
                    venda.itens.forEach(item => {
                        const subtotal = (item.quantidade || 0) * (item.preco_unitario || 0);
                        itensHtml += `<tr><td>${item.produto_nome || '?'}</td><td style="text-align: center;">${item.quantidade || 0}</td><td style="text-align: right;">${subtotal.toFixed(2)}</td></tr>`;
                    });
                } else {
                    itensHtml = '<tr><td colspan="3">Nenhum item detalhado.</td></tr>';
                }

                 let pagamentosHtml = '<p style="margin-top: 5px;"><strong>Pagamento:</strong> ';
                 if (venda.pagamentos && venda.pagamentos.length > 0) {
                      pagamentosHtml += venda.pagamentos.map(p => `${p.metodo}: ${formatCurrency(p.valor)}`).join(' / ');
                 } else {
                      pagamentosHtml += 'N/A';
                 }
                 pagamentosHtml += '</p>';

                vendasContainerEl.innerHTML += `
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

            totalGeralEl.textContent = formatCurrency(totalGeral);
            // --- Modificação aqui ---
            // Verifica se o elemento existe ANTES de setar o textContent
            if (dataGeracaoEl) {
                dataGeracaoEl.textContent = new Date().toLocaleString('pt-BR'); // <= Linha 92 original (aproximadamente)
            } else {
                 console.error("Elemento 'recibo-data-geracao' não encontrado no momento de definir a data.");
                 // Opcional: Mostrar um erro mais visível ou apenas logar
            }
            // --- Fim Modificação ---

            const canvas = await html2canvas(elementoRecibo, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Relatorio_${(currentClienteData?.nome || 'Cliente').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
            link.click();

        } catch (error) {
            console.error('Erro ao gerar relatório:', error); // Mantém o log do erro
            alert(`Ocorreu um erro ao gerar o relatório: ${error.message}`);
        } finally {
             gerarRelatorioBtn.disabled = false;
             gerarRelatorioBtn.innerHTML = '<span class="material-symbols-outlined mr-1 text-sm">download</span> Relatório';
        }
    }

    // ... (restante do código do arquivo cliente-detalhes.js permanece igual) ...
