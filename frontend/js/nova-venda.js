checkAuth(); // Verifica autenticação do funcionário

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const logoutBtn = document.getElementById('logout-btn'); // Assumindo que existe no seu layout global
    const inputBuscaCliente = document.getElementById('input-busca-cliente');
    const autocompleteResultados = document.getElementById('autocomplete-resultados');
    const selectedClienteIdInput = document.getElementById('selected-cliente-id');
    const clienteSelecionadoNomeEl = document.getElementById('cliente-selecionado-nome').querySelector('span');
    const removerClienteBtn = document.getElementById('remover-cliente-btn');
    const btnNovoCliente = document.getElementById('btn-novo-cliente');
    const btnAbrirBuscaProduto = document.getElementById('btn-abrir-busca-produto');
    const carrinhoItensEl = document.getElementById('carrinho-itens');
    const subtotalVendaEl = document.getElementById('subtotal-venda'); // Adicionado para subtotal
    const vendaTotalEl = document.getElementById('venda-total');
    const finalizarVendaBtn = document.getElementById('finalizar-venda-btn');
    const metodosPagamentoContainer = document.getElementById('metodos-pagamento-container');
    const valoresParciaisContainer = document.getElementById('valores-parciais-container');

    // Modais
    const productModal = document.getElementById('product-modal');
    const inputBuscaProdutoModal = document.getElementById('input-busca-produto-modal');
    const listaProdutosModalEl = document.getElementById('lista-produtos-modal');
    const modalNovoCliente = document.getElementById('modal-novo-cliente');
    const formNovoCliente = document.getElementById('form-novo-cliente');
    const btnCancelarNovoCliente = document.getElementById('btn-cancelar-novo-cliente');

    // --- ESTADO DA APLICAÇÃO ---
    let produtosDisponiveis = [];
    let todosClientes = [];
    let carrinho = [];
    let dadosEmpresa = {};
    let totalVenda = 0;
    let buscaClienteTimeout;

    // --- FUNÇÕES DE LÓGICA E RENDERIZAÇÃO ---

    // Carrega clientes (para busca autocomplete)
    async function carregarClientes() {
        try {
            const clientesRes = await fetchWithAuth('/api/clientes');
            if (!clientesRes.ok) throw new Error('Falha ao carregar clientes');
            todosClientes = await clientesRes.json();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            // Poderia mostrar uma mensagem para o usuário
        }
    }

    // Filtra e mostra resultados da busca de clientes
    function mostrarResultadosBuscaCliente(termo) {
        autocompleteResultados.innerHTML = '';
        if (!termo) {
            autocompleteResultados.classList.add('hidden');
            return;
        }

        const termoLower = termo.toLowerCase();
        const filtrados = todosClientes.filter(c => c.nome.toLowerCase().includes(termoLower));

        if (filtrados.length > 0) {
            filtrados.forEach(cliente => {
                const div = document.createElement('div');
                div.className = 'cursor-pointer p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700';
                div.textContent = cliente.nome;
                div.dataset.id = cliente.id;
                div.addEventListener('click', () => selecionarCliente(cliente));
                autocompleteResultados.appendChild(div);
            });
            autocompleteResultados.classList.remove('hidden');
        } else {
            autocompleteResultados.classList.add('hidden');
        }
    }

    // Seleciona um cliente da busca
    function selecionarCliente(cliente) {
        selectedClienteIdInput.value = cliente.id;
        clienteSelecionadoNomeEl.textContent = cliente.nome;
        removerClienteBtn.classList.remove('hidden');
        inputBuscaCliente.value = cliente.nome; // Preenche o input
        autocompleteResultados.classList.add('hidden');
        inputBuscaCliente.disabled = true; // Desabilita busca após selecionar
    }

    // Remove o cliente selecionado
    function removerClienteSelecionado() {
        selectedClienteIdInput.value = '';
        clienteSelecionadoNomeEl.textContent = 'Não selecionado';
        removerClienteBtn.classList.add('hidden');
        inputBuscaCliente.value = '';
        inputBuscaCliente.disabled = false; // Habilita busca novamente
        inputBuscaCliente.focus();
    }

    // Carrega produtos disponíveis (para o modal)
    async function carregarProdutosDisponiveis() {
        try {
            const produtosRes = await fetchWithAuth('/api/produtos');
             if (!produtosRes.ok) throw new Error('Falha ao carregar produtos');
            produtosDisponiveis = await produtosRes.json();
            // Inicialmente renderiza todos no modal
            renderizarProdutosModal(produtosDisponiveis);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
             listaProdutosModalEl.innerHTML = '<p class="text-red-500 p-4">Erro ao carregar produtos.</p>';
        }
    }

     // Renderiza produtos no MODAL de busca
    function renderizarProdutosModal(produtos) {
        listaProdutosModalEl.innerHTML = '';
        const termoBusca = inputBuscaProdutoModal.value.toLowerCase();

        const produtosFiltrados = produtos.filter(p =>
            p.nome.toLowerCase().includes(termoBusca) ||
            (p.codigo && p.codigo.toLowerCase().includes(termoBusca))
        );

        if (produtosFiltrados.length === 0) {
             listaProdutosModalEl.innerHTML = '<p class="text-zinc-500 p-4">Nenhum produto encontrado.</p>';
             return;
        }

        produtosFiltrados.forEach(produto => {
            const itemNoCarrinho = carrinho.find(item => item.id === produto.id);
            const quantidadeNoCarrinho = itemNoCarrinho ? itemNoCarrinho.quantidade : 0;
            const estoqueDisponivel = produto.estoque - quantidadeNoCarrinho;

            if (estoqueDisponivel > 0) {
                 const div = document.createElement('div');
                 div.className = 'bg-white dark:bg-zinc-900 p-3 rounded-xl flex items-center gap-3 shadow-sm produto-selecao-modal cursor-pointer hover:ring-2 hover:ring-primary/50';
                 div.dataset.produtoId = produto.id;
                 div.innerHTML = `
                      <img class="w-14 h-14 rounded-lg object-cover flex-shrink-0" src="${produto.foto_url || 'img/placeholder.png'}" alt="${produto.nome}"/>
                      <div class="flex-1 min-w-0">
                           <p class="font-semibold text-secondary dark:text-zinc-100 truncate">${produto.nome}</p>
                           <p class="text-sm text-zinc-500 dark:text-zinc-400">R$ ${parseFloat(produto.preco).toFixed(2)}</p>
                           <p class="text-xs text-zinc-400">Estoque: ${estoqueDisponivel}</p>
                      </div>
                      <span class="material-symbols-outlined text-primary add-produto-modal-btn">add_circle</span>
                 `;
                 div.addEventListener('click', () => adicionarAoCarrinho(produto.id));
                 listaProdutosModalEl.appendChild(div);
            }
        });
    }

    // Renderiza os itens no carrinho (na tela principal)
    function renderizarCarrinho() {
        carrinhoItensEl.innerHTML = '';
        totalVenda = 0;
        const carrinhoVazioEl = carrinhoItensEl.querySelector('.carrinho-vazio');

        if (carrinho.length === 0) {
            if (!carrinhoVazioEl) { // Adiciona mensagem se não existir
                 carrinhoItensEl.innerHTML = '<p class="text-zinc-500 dark:text-zinc-400 text-center py-4 carrinho-vazio">Nenhum produto adicionado.</p>';
            }
            finalizarVendaBtn.disabled = true;
        } else {
             if (carrinhoVazioEl) carrinhoVazioEl.remove(); // Remove mensagem de vazio
             finalizarVendaBtn.disabled = false;

            carrinho.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'bg-white dark:bg-zinc-900 p-3 rounded-xl flex items-center gap-3 shadow-sm carrinho-item';
                itemEl.dataset.produtoId = item.id;
                const subtotal = item.preco * item.quantidade;
                totalVenda += subtotal;
                const produtoOriginal = produtosDisponiveis.find(p => p.id === item.id);
                const estoqueOriginal = produtoOriginal ? produtoOriginal.estoque : 0; // Pega estoque original
                const isEstoqueMaximo = item.quantidade >= estoqueOriginal;

                itemEl.innerHTML = `
                    <img class="w-14 h-14 rounded-lg object-cover flex-shrink-0" src="${item.foto_url || 'img/placeholder.png'}" alt="${item.nome}"/>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-secondary dark:text-zinc-100 truncate">${item.nome}</p>
                        <p class="text-sm text-zinc-500 dark:text-zinc-400">R$ ${parseFloat(item.preco).toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button class="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-secondary dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors btn-qty-change" data-change="-1">-</button>
                        <span class="w-6 text-center font-bold text-secondary dark:text-white">${item.quantidade}</span>
                        <button class="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-secondary dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors btn-qty-change" data-change="1" ${isEstoqueMaximo ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="text-red-500 hover:text-red-700 transition-colors flex-shrink-0 btn-remover-item">
                        <span class="material-symbols-outlined text-xl">delete</span>
                    </button>
                `;
                carrinhoItensEl.appendChild(itemEl);
            });
        }
        subtotalVendaEl.textContent = `R$ ${totalVenda.toFixed(2)}`;
        vendaTotalEl.textContent = `R$ ${totalVenda.toFixed(2)}`;
        // Atualizar renderização de pagamentos sempre que o carrinho mudar
        renderizarPagamentos();
         // Atualiza a lista de produtos no modal para refletir o estoque disponível
        renderizarProdutosModal(produtosDisponiveis);
    }

     // Renderiza inputs de pagamento parcial se necessário
    function renderizarPagamentos() {
        const checkboxesPagamento = metodosPagamentoContainer.querySelectorAll('input[name="pagamento"]:checked');
        valoresParciaisContainer.innerHTML = ''; // Limpa antes de renderizar

        // Adiciona/Remove a classe 'active' nos botões de pagamento
        metodosPagamentoContainer.querySelectorAll('.payment-button').forEach(label => {
            const input = label.querySelector('input');
            if (input.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });

        if (checkboxesPagamento.length > 1) {
            checkboxesPagamento.forEach(input => {
                const valorMetodo = input.value;
                const div = document.createElement('div');
                div.className = 'relative'; // Para posicionar o R$
                div.innerHTML = `
                    <label for="valor-${valorMetodo.toLowerCase().replace(' ', '-')}" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Valor em ${valorMetodo}</label>
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none pt-6"> <span class="text-zinc-500 sm:text-sm">R$</span>
                    </div>
                    <input type="number" step="0.01" min="0.01" id="valor-${valorMetodo.toLowerCase().replace(' ', '-')}" class="valor-parcial form-input block w-full pl-7 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-secondary dark:text-white bg-white dark:bg-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" data-metodo="${valorMetodo}" placeholder="0,00">
                `;
                valoresParciaisContainer.appendChild(div);
            });
        }
    }


    // Adiciona produto ao carrinho
    function adicionarAoCarrinho(produtoId) {
        const produto = produtosDisponiveis.find(p => p.id === produtoId);
        if (!produto) return;

        const itemNoCarrinho = carrinho.find(item => item.id === produtoId);
        const quantidadeNoCarrinho = itemNoCarrinho ? itemNoCarrinho.quantidade : 0;

        if (produto.estoque <= quantidadeNoCarrinho) {
            alert(`Estoque máximo atingido para "${produto.nome}".`);
            return;
        }

        if (itemNoCarrinho) {
            itemNoCarrinho.quantidade++;
        } else {
            // Adiciona cópia do produto com quantidade 1
            carrinho.push({
                id: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                foto_url: produto.foto_url, // Guarda a foto para exibir no carrinho
                // Não precisa guardar estoque aqui, vamos pegar do produtosDisponiveis
                quantidade: 1
            });
        }
        renderizarCarrinho();
         // Não precisa fechar o modal, permite adicionar múltiplos produtos
        // productModal.classList.remove('is-open');
    }

    // Altera quantidade no carrinho
    function alterarQuantidade(produtoId, mudanca) {
        const itemIndex = carrinho.findIndex(item => item.id === produtoId);
        if (itemIndex === -1) return;

        const item = carrinho[itemIndex];
        const produtoOriginal = produtosDisponiveis.find(p => p.id === produtoId);
        const estoqueOriginal = produtoOriginal ? produtoOriginal.estoque : 0;

        const novaQuantidade = item.quantidade + mudanca;

        if (novaQuantidade <= 0) {
            // Remove o item se a quantidade for zero ou menos
            carrinho.splice(itemIndex, 1);
        } else if (novaQuantidade > estoqueOriginal) {
            alert(`Estoque máximo (${estoqueOriginal}) atingido para "${item.nome}".`);
            // Mantém a quantidade no máximo do estoque
            item.quantidade = estoqueOriginal;
        } else {
            item.quantidade = novaQuantidade;
        }
        renderizarCarrinho();
    }

    // Remove item do carrinho
    function removerDoCarrinho(produtoId) {
        carrinho = carrinho.filter(item => item.id !== produtoId);
        renderizarCarrinho();
    }

    // Inicializa a página
    async function inicializar() {
        await carregarClientes();
        await carregarProdutosDisponiveis(); // Carrega produtos para o modal
        renderizarCarrinho(); // Garante que o estado inicial do carrinho seja exibido

         // Carrega dados da empresa (pode ser útil para recibo ou outras infos)
        try {
             const empresaRes = await fetchWithAuth('/api/empresas/meus-dados');
             if (empresaRes.ok) dadosEmpresa = await empresaRes.json();
        } catch (error) {
             console.error('Erro ao buscar dados da empresa:', error);
        }
    }

    // --- EVENT LISTENERS ---

    // Busca de Cliente Autocomplete
    inputBuscaCliente.addEventListener('keyup', (e) => {
        clearTimeout(buscaClienteTimeout);
        const termo = e.target.value;
        // Espera um pouco antes de buscar para não sobrecarregar
        buscaClienteTimeout = setTimeout(() => {
            mostrarResultadosBuscaCliente(termo);
        }, 300);
    });
     // Esconde autocomplete se clicar fora
    document.addEventListener('click', (e) => {
        if (!inputBuscaCliente.contains(e.target) && !autocompleteResultados.contains(e.target)) {
            autocompleteResultados.classList.add('hidden');
        }
    });
    removerClienteBtn.addEventListener('click', removerClienteSelecionado);

    // Modal de Novo Cliente
    btnNovoCliente.addEventListener('click', () => {
        formNovoCliente.reset(); // Limpa o formulário
        modalNovoCliente.classList.add('is-open');
    });
    btnCancelarNovoCliente.addEventListener('click', () => {
        modalNovoCliente.classList.remove('is-open');
    });
     // Fechar modal clicando fora
    modalNovoCliente.addEventListener('click', (e) => {
        if (e.target === modalNovoCliente) {
             modalNovoCliente.classList.remove('is-open');
        }
    });
    formNovoCliente.addEventListener('submit', async (event) => {
        event.preventDefault();
        const novoCliente = {
            nome: document.getElementById('modal-nome').value,
            telefone: document.getElementById('modal-telefone').value,
            cpf: document.getElementById('modal-cpf').value // Adicionado CPF
        };
        try {
            const response = await fetchWithAuth('/api/clientes', {
                method: 'POST',
                body: JSON.stringify(novoCliente)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Recarrega a lista de clientes E seleciona o recém-criado
            await carregarClientes();
            const clienteCriado = todosClientes.find(c => c.id === data.clienteId);
            if (clienteCriado) selecionarCliente(clienteCriado);

            modalNovoCliente.classList.remove('is-open');
        } catch (error) {
            alert(`Erro ao salvar cliente: ${error.message}`);
        }
    });

    // Modal de Busca de Produto
    btnAbrirBuscaProduto.addEventListener('click', () => {
        inputBuscaProdutoModal.value = ''; // Limpa busca anterior
        renderizarProdutosModal(produtosDisponiveis); // Mostra todos disponíveis
        productModal.classList.add('is-open');
        inputBuscaProdutoModal.focus();
    });
    inputBuscaProdutoModal.addEventListener('keyup', () => {
         renderizarProdutosModal(produtosDisponiveis);
    });
     // Fechar modal clicando fora
     productModal.addEventListener('click', (e) => {
        // Verifica se o clique foi no overlay e não em um filho dele
        if (e.target === productModal) {
            productModal.classList.remove('is-open');
        }
    });

    // Ações no Carrinho (delegação de eventos)
    carrinhoItensEl.addEventListener('click', (event) => {
        const target = event.target;
        const itemEl = target.closest('.carrinho-item');
        if (!itemEl) return;

        const produtoId = parseInt(itemEl.dataset.produtoId);

        if (target.closest('.btn-qty-change')) {
            const change = parseInt(target.closest('.btn-qty-change').dataset.change);
            alterarQuantidade(produtoId, change);
        } else if (target.closest('.btn-remover-item')) {
            removerDoCarrinho(produtoId);
        }
    });

     // Seleção de Método de Pagamento
    metodosPagamentoContainer.addEventListener('change', renderizarPagamentos);

    // Finalizar Venda
    finalizarVendaBtn.addEventListener('click', async () => {
        if (carrinho.length === 0) {
             alert('Adicione produtos ao carrinho antes de finalizar.');
             return;
        }

        const clienteId = selectedClienteIdInput.value ? parseInt(selectedClienteIdInput.value) : null;
        const itensVenda = carrinho.map(item => ({ produto_id: item.id, quantidade: item.quantidade }));
        const checkboxesPagamento = metodosPagamentoContainer.querySelectorAll('input[name="pagamento"]:checked');

        if (checkboxesPagamento.length === 0) {
            alert('Selecione pelo menos uma forma de pagamento.');
            return;
        }

        let pagamentos = [];
        let somaPagamentos = 0;
        let erroPagamentoParcial = false;

        if (checkboxesPagamento.length === 1) {
            // Pagamento único
            const metodo = checkboxesPagamento[0].value;
            pagamentos.push({ metodo: metodo, valor: totalVenda });
            somaPagamentos = totalVenda;
        } else {
            // Pagamento parcial
            const inputsParciais = valoresParciaisContainer.querySelectorAll('.valor-parcial');
            inputsParciais.forEach(input => {
                const valor = parseFloat(input.value) || 0;
                if (valor < 0.01 && input.required) { // Considerar validação se necessário
                     erroPagamentoParcial = true;
                     input.classList.add('border-red-500'); // Destaca campo inválido
                } else if (valor >= 0.01) {
                     pagamentos.push({ metodo: input.dataset.metodo, valor: valor });
                     somaPagamentos += valor;
                     input.classList.remove('border-red-500');
                } else {
                     input.classList.remove('border-red-500');
                }
            });

            if (erroPagamentoParcial) {
                 alert('Preencha os valores para todas as formas de pagamento selecionadas.');
                 return;
            }
             if (pagamentos.length === 0) { // Garante que pelo menos um valor foi inserido
                 alert('Insira o valor para pelo menos uma das formas de pagamento selecionadas.');
                 return;
             }
        }

        // Verifica se a soma dos pagamentos bate com o total (com uma pequena margem para erros de ponto flutuante)
        if (Math.abs(somaPagamentos - totalVenda) > 0.01) {
            if (!confirm(`A soma dos pagamentos (R$ ${somaPagamentos.toFixed(2)}) é diferente do total da venda (R$ ${totalVenda.toFixed(2)}). Deseja continuar mesmo assim?`)) {
                return;
            }
             // Ajusta o valor_total da venda para ser a soma dos pagamentos, se o usuário confirmar
             // Nota: O backend atualmente usa a soma dos preços dos itens. Se precisar que o total seja a soma dos pagamentos, o backend precisa ser ajustado.
             // Para esta implementação, manteremos o valor_total como a soma dos itens.
        }

        // Envia para o backend
        try {
            finalizarVendaBtn.disabled = true;
            finalizarVendaBtn.innerHTML = `
                 <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                     <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Processando...`;

            const response = await fetchWithAuth('/api/vendas', {
                method: 'POST',
                body: JSON.stringify({
                    cliente_id: clienteId,
                    itens: itensVenda,
                    pagamentos: pagamentos // Envia array de pagamentos
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro desconhecido ao registrar venda.');

            // Redireciona para a página de sucesso/compartilhamento
            window.location.href = `venda-concluida.html?id=${data.vendaId}`;

            // Limpeza não é mais necessária aqui, pois há redirecionamento

        } catch (error) {
            alert(`Erro ao finalizar venda: ${error.message}`);
            finalizarVendaBtn.disabled = false;
            finalizarVendaBtn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Finalizar Venda';
        }
    });

    // Logout (se o botão existir no seu layout global)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // --- INICIALIZAÇÃO DA PÁGINA ---
    inicializar();
});
