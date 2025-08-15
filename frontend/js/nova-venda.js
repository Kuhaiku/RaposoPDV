checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const logoutBtn = document.getElementById('logout-btn');
    const listaProdutosEl = document.getElementById('lista-produtos');
    const buscaProdutoInput = document.getElementById('busca-produto');
    const carrinhoItensEl = document.getElementById('carrinho-itens');
    const vendaTotalEl = document.getElementById('venda-total');
    const finalizarVendaBtn = document.getElementById('finalizar-venda-btn');
    const btnNovoCliente = document.getElementById('btn-novo-cliente');
    const modalNovoCliente = document.getElementById('modal-novo-cliente');
    const formNovoCliente = document.getElementById('form-novo-cliente');
    const btnCancelarNovoCliente = document.getElementById('btn-cancelar-novo-cliente');
    const gerarReciboCheck = document.getElementById('gerar-recibo-check');
    
    // Novos elementos para busca de cliente
    const buscaClienteInputEl = document.getElementById('busca-cliente');
    const clienteIdInput = document.getElementById('cliente-id');
    const clienteResultadosEl = document.getElementById('cliente-resultados');

    // Novos elementos para pagamento
    const metodosPagamentoContainer = document.querySelector('.metodos-pagamento');
    const valoresParciaisContainer = document.getElementById('valores-parciais-container');

    // --- ESTADO DA APLICAÇÃO ---
    let produtosDisponiveis = [];
    let todosClientes = [];
    let carrinho = [];
    let dadosEmpresa = {};
    let totalVenda = 0;

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function renderizarProdutos(produtos) {
        listaProdutosEl.innerHTML = '';
        const termoBusca = buscaProdutoInput.value.toLowerCase();
        produtos
            .filter(p => p.nome.toLowerCase().includes(termoBusca))
            .forEach(produto => {
                const itemNoCarrinho = carrinho.find(item => item.id === produto.id);
                const quantidadeNoCarrinho = itemNoCarrinho ? itemNoCarrinho.quantidade : 0;
                if (produto.estoque > quantidadeNoCarrinho) {
                    const card = document.createElement('div');
                    card.className = 'produto-selecao-card';
                    card.dataset.produtoId = produto.id;
                    card.innerHTML = `<img src="${produto.foto_url}" alt="${produto.nome}"><h4>${produto.nome}</h4><p>R$ ${parseFloat(produto.preco).toFixed(2)}</p>`;
                    listaProdutosEl.appendChild(card);
                }
            });
    }

    function renderizarCarrinho() {
        carrinhoItensEl.innerHTML = '';
        totalVenda = 0;
        if (carrinho.length === 0) {
            carrinhoItensEl.innerHTML = '<p class="carrinho-vazio">Selecione produtos para adicioná-los à venda.</p>';
            finalizarVendaBtn.disabled = true;
        } else {
            finalizarVendaBtn.disabled = false;
            carrinho.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'carrinho-item';
                itemEl.dataset.produtoId = item.id;
                const subtotal = item.preco * item.quantidade;
                totalVenda += subtotal;
                const isEstoqueMaximo = item.quantidade >= item.estoque;
                itemEl.innerHTML = `<div class="carrinho-item-info"><div class="carrinho-item-nome">${item.nome}</div><div class="carrinho-item-preco">R$ ${parseFloat(item.preco).toFixed(2)}</div></div><div class="carrinho-item-actions"><button class="btn-qty-change" data-change="-1">-</button><span>${item.quantidade}</span><button class="btn-qty-change" data-change="1" ${isEstoqueMaximo ? 'disabled' : ''}>+</button><button class="btn-remover-item">&times;</button></div>`;
                carrinhoItensEl.appendChild(itemEl);
            });
        }
        vendaTotalEl.textContent = `R$ ${totalVenda.toFixed(2)}`;
        renderizarPagamentos();
    }

    function renderizarPagamentos() {
        const metodosSelecionados = document.querySelectorAll('input[name="pagamento"]:checked');
        valoresParciaisContainer.innerHTML = '';

        if (metodosSelecionados.length > 1) {
            metodosSelecionados.forEach(input => {
                const valor = input.value;
                const div = document.createElement('div');
                div.className = 'input-group';
                div.innerHTML = `
                    <label for="valor-${valor.toLowerCase()}">Valor em ${valor}</label>
                    <input type="number" step="0.01" id="valor-${valor.toLowerCase()}" class="valor-parcial" data-metodo="${valor}" placeholder="0.00">
                `;
                valoresParciaisContainer.appendChild(div);
            });
        }
    }

    // --- FUNÇÕES DE DADOS E LÓGICA ---
    async function carregarClientes() {
        try {
            const clientesRes = await fetchWithAuth('/api/clientes');
            todosClientes = await clientesRes.json();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    function adicionarAoCarrinho(produtoId) {
        const produto = produtosDisponiveis.find(p => p.id === produtoId);
        if (!produto) return;
        if (produto.estoque <= 0) {
            alert(`O produto "${produto.nome}" está fora de estoque.`);
            return;
        }
        const itemNoCarrinho = carrinho.find(item => item.id === produtoId);
        if (itemNoCarrinho) {
            if (itemNoCarrinho.quantidade < produto.estoque) {
                itemNoCarrinho.quantidade++;
            } else {
                alert(`Estoque máximo atingido para "${produto.nome}".`);
            }
        } else {
            carrinho.push({ ...produto, quantidade: 1 });
        }
        renderizarCarrinho();
        renderizarProdutos(produtosDisponiveis);
    }
    
    function alterarQuantidade(produtoId, mudanca) {
        const itemNoCarrinho = carrinho.find(item => item.id === produtoId);
        if (!itemNoCarrinho) return;
        if (mudanca > 0) {
            if (itemNoCarrinho.quantidade < itemNoCarrinho.estoque) {
                itemNoCarrinho.quantidade += mudanca;
            } else {
                alert(`Estoque máximo atingido para "${itemNoCarrinho.nome}".`);
            }
        } else {
            itemNoCarrinho.quantidade += mudanca;
        }
        if (itemNoCarrinho.quantidade <= 0) {
            removerDoCarrinho(produtoId);
        } else {
            renderizarCarrinho();
            renderizarProdutos(produtosDisponiveis);
        }
    }

    function removerDoCarrinho(produtoId) {
        carrinho = carrinho.filter(item => item.id !== produtoId);
        renderizarCarrinho();
        renderizarProdutos(produtosDisponiveis);
    }

    async function inicializar() {
        try {
            const [produtosRes, empresaRes, clientesRes] = await Promise.all([
                fetchWithAuth('/api/produtos'),
                fetchWithAuth('/api/empresas/meus-dados'),
                fetchWithAuth('/api/clientes')
            ]);
            produtosDisponiveis = await produtosRes.json();
            dadosEmpresa = await empresaRes.json();
            todosClientes = await clientesRes.json();
            renderizarProdutos(produtosDisponiveis);
        } catch (error) {
            console.error('Erro ao inicializar página:', error);
            alert('Não foi possível carregar os dados. Tente novamente.');
        }
    }
    
    async function gerarRecibo(vendaId, somaPagamentos) {
        try {
            const response = await fetchWithAuth(`/api/vendas/${vendaId}`);
            if (!response.ok) throw new Error('Não foi possível buscar os dados para o recibo.');
            const detalhesVenda = await response.json();

            const reciboHeader = document.querySelector('#recibo-template .recibo-header');
            reciboHeader.innerHTML = `<h2>${dadosEmpresa.nome_empresa || ''}</h2><p>${dadosEmpresa.endereco_comercial || ''}</p><p>${dadosEmpresa.telefone_comercial || ''}</p><p>Comprovante de Venda</p>`;

            document.getElementById('recibo-venda-id').textContent = `#${detalhesVenda.id}`;
            document.getElementById('recibo-data').textContent = new Date(detalhesVenda.data_venda).toLocaleString('pt-BR');
            document.getElementById('recibo-cliente').textContent = detalhesVenda.cliente_nome || 'Não identificado';
            document.getElementById('recibo-vendedor').textContent = detalhesVenda.usuario_nome;

            const reciboItensBody = document.getElementById('recibo-itens');
            reciboItensBody.innerHTML = '';
            let totalProdutos = 0;
            detalhesVenda.itens.forEach(item => {
                const subtotal = item.quantidade * item.preco_unitario;
                totalProdutos += subtotal;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${item.produto_nome}</td><td style="text-align: center;">${item.quantidade}</td><td>R$ ${parseFloat(item.preco_unitario).toFixed(2)}</td><td style="text-align: right;">${subtotal.toFixed(2)}</td>`;
                reciboItensBody.appendChild(tr);
            });

            const taxas = somaPagamentos - totalProdutos;
            if (taxas > 0.001) { // Adiciona margem para erros de ponto flutuante
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>Taxas/Acréscimos</td><td></td><td></td><td style="text-align: right;">${taxas.toFixed(2)}</td>`;
                reciboItensBody.appendChild(tr);
            }

            const reciboPagamentosDiv = document.getElementById('recibo-pagamentos');
            reciboPagamentosDiv.innerHTML = '<h4>Pagamentos:</h4>';
            detalhesVenda.pagamentos.forEach(p => {
                reciboPagamentosDiv.innerHTML += `<p style="margin: 2px 0;">- ${p.metodo}: R$ ${parseFloat(p.valor).toFixed(2)}</p>`;
            });

            document.getElementById('recibo-total-valor').textContent = `R$ ${somaPagamentos.toFixed(2)}`;

            const elementoRecibo = document.getElementById('recibo-template');
            const canvas = await html2canvas(elementoRecibo);
            
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Recibo-Venda_${detalhesVenda.id}.png`;
            link.click();
        } catch (error) {
            console.error('Erro ao gerar recibo:', error);
            alert('A venda foi registrada, mas houve um erro ao gerar o recibo.');
        }
    }
    
    // --- EVENT LISTENERS ---
    buscaClienteInputEl.addEventListener('keyup', () => {
        const termo = buscaClienteInputEl.value.toLowerCase();
        clienteResultadosEl.style.display = 'block';
        clienteResultadosEl.innerHTML = '';
        if (termo.length < 1) {
            clienteResultadosEl.style.display = 'none';
            return;
        }

        const filtrados = todosClientes.filter(c => c.nome.toLowerCase().includes(termo));
        if (filtrados.length === 0) {
             clienteResultadosEl.style.display = 'none';
             return;
        }
        filtrados.forEach(cliente => {
            const div = document.createElement('div');
            div.textContent = cliente.nome;
            div.dataset.id = cliente.id;
            clienteResultadosEl.appendChild(div);
        });
    });

    clienteResultadosEl.addEventListener('click', (e) => {
        if (e.target.tagName === 'DIV') {
            buscaClienteInputEl.value = e.target.textContent;
            clienteIdInput.value = e.target.dataset.id;
            clienteResultadosEl.innerHTML = '';
            clienteResultadosEl.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!buscaClienteInputEl.contains(e.target) && !clienteResultadosEl.contains(e.target)) {
            clienteResultadosEl.style.display = 'none';
        }
    });

    metodosPagamentoContainer.addEventListener('change', renderizarPagamentos);

    finalizarVendaBtn.addEventListener('click', async () => {
        if (carrinho.length === 0) return;

        const clienteId = clienteIdInput.value ? parseInt(clienteIdInput.value) : null;
        const itensVenda = carrinho.map(item => ({ produto_id: item.id, quantidade: item.quantidade }));
        const metodosSelecionados = document.querySelectorAll('input[name="pagamento"]:checked');

        if (metodosSelecionados.length === 0) {
            return alert('Selecione pelo menos uma forma de pagamento.');
        }

        let pagamentos = [];
        let somaPagamentos = 0;

        if (metodosSelecionados.length === 1) {
            pagamentos.push({ metodo: metodosSelecionados[0].value, valor: totalVenda });
            somaPagamentos = totalVenda;
        } else {
            const inputsParciais = document.querySelectorAll('.valor-parcial');
            let algumValorPreenchido = false;
            inputsParciais.forEach(input => {
                const valor = parseFloat(input.value) || 0;
                if (valor > 0) {
                    pagamentos.push({ metodo: input.dataset.metodo, valor: valor });
                    somaPagamentos += valor;
                    algumValorPreenchido = true;
                }
            });
            if (!algumValorPreenchido) {
                return alert('Preencha o valor para cada forma de pagamento selecionada.');
            }
        }

        if (somaPagamentos.toFixed(2) !== totalVenda.toFixed(2)) {
            if (!confirm(`A soma dos pagamentos (R$ ${somaPagamentos.toFixed(2)}) é diferente do total da venda (R$ ${totalVenda.toFixed(2)}). Deseja continuar mesmo assim?`)) {
                return;
            }
        }
        
        try {
            finalizarVendaBtn.disabled = true; // Desabilita o botão para evitar cliques duplos
            finalizarVendaBtn.textContent = 'Processando...';

            const response = await fetchWithAuth('/api/vendas', {
                method: 'POST',
                body: JSON.stringify({ cliente_id: clienteId, itens: itensVenda, pagamentos })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            if (gerarReciboCheck.checked) {
                alert('Venda registrada com sucesso! O recibo será baixado.');
                await gerarRecibo(data.vendaId, somaPagamentos);
            } else {
                alert('Venda registrada com sucesso!');
            }
            
            // Resetar a tela
            carrinho = [];
            clienteIdInput.value = '';
            buscaClienteInputEl.value = '';
            metodosSelecionados.forEach(c => c.checked = false);
            renderizarCarrinho(); // Isso também vai chamar renderizarPagamentos
            await inicializar();
        } catch (error) {
            alert(`Erro ao finalizar venda: ${error.message}`);
        } finally {
            finalizarVendaBtn.disabled = false; // Reabilita o botão
            finalizarVendaBtn.textContent = 'Finalizar Venda';
        }
    });

    logoutBtn.addEventListener('click', logout);
    
    listaProdutosEl.addEventListener('click', (event) => {
        const card = event.target.closest('.produto-selecao-card');
        if (card) adicionarAoCarrinho(parseInt(card.dataset.produtoId));
    });
    
    carrinhoItensEl.addEventListener('click', (event) => {
        const target = event.target;
        const itemEl = target.closest('.carrinho-item');
        if (!itemEl) return;
        const produtoId = parseInt(itemEl.dataset.produtoId);
        if (target.classList.contains('btn-qty-change')) {
            alterarQuantidade(produtoId, parseInt(target.dataset.change));
        }
        if (target.classList.contains('btn-remover-item')) {
            removerDoCarrinho(produtoId);
        }
    });
    
    btnNovoCliente.addEventListener('click', () => {
        modalNovoCliente.style.display = 'flex';
    });
    
    btnCancelarNovoCliente.addEventListener('click', () => {
        modalNovoCliente.style.display = 'none';
    });
    
    formNovoCliente.addEventListener('submit', async (event) => {
        event.preventDefault();
        const novoCliente = {
            nome: document.getElementById('modal-nome').value,
            telefone: document.getElementById('modal-telefone').value,
            cpf: document.getElementById('modal-cpf').value,
        };
        try {
            const response = await fetchWithAuth('/api/clientes', {
                method: 'POST',
                body: JSON.stringify(novoCliente)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            await carregarClientes(); // Atualiza a lista de clientes
            buscaClienteInputEl.value = novoCliente.nome;
            clienteIdInput.value = data.clienteId;
            modalNovoCliente.style.display = 'none';
            formNovoCliente.reset();
        } catch (error) {
            alert(error.message);
        }
    });

    inicializar();
});
