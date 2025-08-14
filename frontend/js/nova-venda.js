checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    
    const logoutBtn = document.getElementById('logout-btn');
    const listaProdutosEl = document.getElementById('lista-produtos');
    const buscaProdutoInput = document.getElementById('busca-produto');
    const selectClienteEl = document.getElementById('select-cliente');
    const carrinhoItensEl = document.getElementById('carrinho-itens');
    const vendaTotalEl = document.getElementById('venda-total');
    const finalizarVendaBtn = document.getElementById('finalizar-venda-btn');
    const btnNovoCliente = document.getElementById('btn-novo-cliente');
    const modalNovoCliente = document.getElementById('modal-novo-cliente');
    const formNovoCliente = document.getElementById('form-novo-cliente');
    const btnCancelarNovoCliente = document.getElementById('btn-cancelar-novo-cliente');
    const gerarReciboCheck = document.getElementById('gerar-recibo-check');

    let produtosDisponiveis = [];
    let carrinho = [];
    let dadosEmpresa = {}; // NOVA VARIÁVEL para guardar os dados da empresa

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
        let total = 0;
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
                total += subtotal;
                const isEstoqueMaximo = item.quantidade >= item.estoque;
                itemEl.innerHTML = `<div class="carrinho-item-info"><div class="carrinho-item-nome">${item.nome}</div><div class="carrinho-item-preco">R$ ${parseFloat(item.preco).toFixed(2)}</div></div><div class="carrinho-item-actions"><button class="btn-qty-change" data-change="-1">-</button><span>${item.quantidade}</span><button class="btn-qty-change" data-change="1" ${isEstoqueMaximo ? 'disabled' : ''}>+</button><button class="btn-remover-item">&times;</button></div>`;
                carrinhoItensEl.appendChild(itemEl);
            });
        }
        vendaTotalEl.textContent = `R$ ${total.toFixed(2)}`;
    }

    async function carregarClientes() {
        try {
            const clientesRes = await fetchWithAuth('/api/clientes');
            const clientes = await clientesRes.json();
            selectClienteEl.innerHTML = '<option value="">Venda sem cliente</option>';
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nome;
                selectClienteEl.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    // FUNÇÃO ATUALIZADA para usar os dados da empresa
    async function gerarRecibo(vendaId) {
        try {
            const response = await fetchWithAuth(`/api/vendas/${vendaId}`);
            if (!response.ok) throw new Error('Não foi possível buscar os dados para o recibo.');
            const detalhesVenda = await response.json();

            // Popula os dados da empresa no cabeçalho do recibo
            const reciboHeader = document.querySelector('#recibo-template .recibo-header');
            reciboHeader.innerHTML = `
                <h2>${dadosEmpresa.nome_empresa || 'Comprovante'}</h2>
                <p>${dadosEmpresa.endereco_comercial || ''}</p>
                <p>${dadosEmpresa.telefone_comercial || ''}</p>
                <p>Comprovante de Venda</p>
            `;

            // Popula o resto das informações
            document.getElementById('recibo-venda-id').textContent = `#${detalhesVenda.id}`;
            document.getElementById('recibo-data').textContent = new Date(detalhesVenda.data_venda).toLocaleString('pt-BR');
            document.getElementById('recibo-cliente').textContent = detalhesVenda.cliente_nome || 'Não identificado';
            document.getElementById('recibo-vendedor').textContent = detalhesVenda.usuario_nome;

            const reciboItensBody = document.getElementById('recibo-itens');
            reciboItensBody.innerHTML = '';
            detalhesVenda.itens.forEach(item => {
                const subtotal = item.quantidade * item.preco_unitario;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${item.produto_nome}</td><td style="text-align: center;">${item.quantidade}</td><td style="text-align: right;">${parseFloat(item.preco_unitario).toFixed(2)}</td><td style="text-align: right;">${subtotal.toFixed(2)}</td>`;
                reciboItensBody.appendChild(tr);
            });

            document.getElementById('recibo-total-valor').textContent = `R$ ${parseFloat(detalhesVenda.valor_total).toFixed(2)}`;

            const elementoRecibo = document.getElementById('recibo-template');
            const canvas = await html2canvas(elementoRecibo);
            
            const link = document.createElement('a');
            link.href = canvas.
