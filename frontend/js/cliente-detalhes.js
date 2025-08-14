checkAuth();

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DO DOM ---
    const logoutBtn = document.getElementById('logout-btn');
    const nomeClienteHeader = document.getElementById('nome-cliente-header');
    const totalGastoEl = document.getElementById('total-gasto');
    const totalComprasEl = document.getElementById('total-compras');
    const dadosCadastraisEl = document.getElementById('dados-cadastrais');
    const historicoComprasBody = document.getElementById('historico-compras-body');
    const gerarRelatorioBtn = document.getElementById('gerar-relatorio-btn');
    const selecionarTodasCheck = document.getElementById('selecionar-todas');

    function formatarData(dataISO) {
        if (!dataISO) return 'N/A';
        return new Date(dataISO).toLocaleDateString('pt-BR');
    }

    // --- FUNÇÕES PRINCIPAIS ---

    async function gerarRelatorio() {
        const checkboxesMarcadas = document.querySelectorAll('.venda-checkbox:checked');
        if (checkboxesMarcadas.length === 0) {
            alert('Por favor, selecione pelo menos uma venda para gerar o relatório.');
            return;
        }

        const vendaIds = Array.from(checkboxesMarcadas).map(cb => cb.dataset.vendaId);

        try {
            const promessas = vendaIds.map(id => fetchWithAuth(`/api/vendas/${id}`).then(res => res.json()));
            const detalhesVendas = await Promise.all(promessas);

            document.getElementById('recibo-cliente-nome').textContent = nomeClienteHeader.textContent;
            const reciboVendasContainer = document.getElementById('recibo-vendas-container');
            reciboVendasContainer.innerHTML = '';
            let totalGeral = 0;

            detalhesVendas.forEach(venda => {
                let itensHtml = '';
                venda.itens.forEach(item => {
                    const subtotal = item.quantidade * item.preco_unitario;
                    itensHtml += `<tr><td>${item.produto_nome}</td><td style="text-align: center;">${item.quantidade}</td><td style="text-align: right;">${subtotal.toFixed(2)}</td></tr>`;
                });

                reciboVendasContainer.innerHTML += `
                    <div class="recibo-info" style="border-top: 2px solid #000; padding-top: 15px; margin-top: 15px;">
                        <p><strong>Venda:</strong> #${venda.id}</p>
                        <p><strong>Data:</strong> ${new Date(venda.data_venda).toLocaleString('pt-BR')}</p>
                    </div>
                    <table class="recibo-tabela">
                        <thead><tr><th>Item</th><th style="text-align: center;">Qtd.</th><th style="text-align: right;">Subtotal</th></tr></thead>
                        <tbody>${itensHtml}</tbody>
                    </table>
                    <div class="recibo-total" style="font-size: 1rem; border-top: 1px dashed #000;">
                        <strong>TOTAL DA VENDA: R$ ${parseFloat(venda.valor_total).toFixed(2)}</strong>
                    </div>`;
                totalGeral += parseFloat(venda.valor_total);
            });

            document.getElementById('recibo-total-geral').textContent = `R$ ${totalGeral.toFixed(2)}`;
            document.getElementById('recibo-data-geracao').textContent = new Date().toLocaleString('pt-BR');

            const elementoRecibo = document.getElementById('recibo-template');
            const canvas = await html2canvas(elementoRecibo);
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Relatorio-${nomeClienteHeader.textContent.replace(/\s+/g, '_')}.png`;
            link.click();
        } catch (error) {
            alert('Ocorreu um erro ao gerar o relatório.');
            console.error(error);
        }
    }

    async function carregarDetalhesCliente() {
        const urlParams = new URLSearchParams(window.location.search);
        const clienteId = urlParams.get('id');
        if (!clienteId) {
            alert('ID do cliente não encontrado.');
            window.location.href = 'clientes.html';
            return;
        }

        try {
            const response = await fetchWithAuth(`/api/clientes/${clienteId}/detalhes`);
            if (!response.ok) throw new Error('Erro ao carregar detalhes do cliente.');
            const cliente = await response.json();

            nomeClienteHeader.textContent = cliente.nome;
            totalGastoEl.textContent = `R$ ${parseFloat(cliente.total_gasto).toFixed(2)}`;
            totalComprasEl.textContent = cliente.historico_compras.length;

            dadosCadastraisEl.innerHTML = `
                <p><strong>Nome Completo:</strong> ${cliente.nome}</p>
                <p><strong>Telefone:</strong> ${cliente.telefone || 'Não informado'}</p>
                <p><strong>CPF:</strong> ${cliente.cpf || 'Não informado'}</p>
                <p><strong>Email:</strong> ${cliente.email || 'Não informado'}</p>
                <p><strong>Endereço:</strong> ${cliente.logradouro || ''}, ${cliente.numero || ''} - ${cliente.bairro || ''}</p>
                <p><strong>Cidade/UF:</strong> ${cliente.cidade || ''} / ${cliente.estado || ''}</p>
                <p><strong>CEP:</strong> ${cliente.cep || 'Não informado'}</p>
            `;

            historicoComprasBody.innerHTML = '';
            if (cliente.historico_compras.length > 0) {
                cliente.historico_compras.forEach(venda => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><input type="checkbox" class="venda-checkbox" data-venda-id="${venda.id}"></td>
                        <td>#${venda.id}</td>
                        <td>${formatarData(venda.data_venda)}</td>
                        <td>R$ ${parseFloat(venda.valor_total).toFixed(2)}</td>
                    `;
                    historicoComprasBody.appendChild(tr);
                });
            } else {
                gerarRelatorioBtn.style.display = 'none';
                selecionarTodasCheck.parentElement.style.display = 'none';
                historicoComprasBody.innerHTML = '<tr><td colspan="4">Nenhuma compra registrada.</td></tr>';
            }
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', logout);
    gerarRelatorioBtn.addEventListener('click', gerarRelatorio);
    selecionarTodasCheck.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        document.querySelectorAll('.venda-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });
    });

    // Roda a inicialização da página
    carregarDetalhesCliente();
});