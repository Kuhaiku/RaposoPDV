document.addEventListener('DOMContentLoaded', () => {

    const API_URL = '';

    // --- ELEMENTOS DO DOM ---
    const catalogoGrid = document.getElementById('catalogo-grid');
    const nomeEmpresaHeader = document.getElementById('nome-empresa-header');
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxClose = document.querySelector('.lightbox-close');
    const buscaProdutoInput = document.getElementById('busca-produto-catalogo');
    const filtrosCategoriaContainer = document.getElementById('filtros-categoria');

    // --- ESTADO DA APLICAÇÃO ---
    let todosProdutos = [];
    let categoriaAtiva = 'todos';

    // --- FUNÇÕES DE RENDERIZAÇÃO E FILTRO ---

    function renderizarProdutos() {
        catalogoGrid.innerHTML = '';
        const termoBusca = buscaProdutoInput.value.toLowerCase();

        const produtosFiltrados = todosProdutos.filter(produto => {
            const correspondeBusca = produto.nome.toLowerCase().includes(termoBusca);
            const correspondeCategoria = (categoriaAtiva === 'todos' || produto.categoria === categoriaAtiva);
            return correspondeBusca && correspondeCategoria;
        });

        if (produtosFiltrados.length === 0) {
            catalogoGrid.innerHTML = '<p>Nenhum produto encontrado com os filtros aplicados.</p>';
            return;
        }

        produtosFiltrados.forEach(produto => {
            const card = document.createElement('div');
            card.className = 'produto-card';
            card.dataset.imageUrl = produto.foto_url;
            
            card.innerHTML = `
                <img src="${produto.foto_url || 'img/placeholder.png'}" alt="${produto.nome}" class="produto-card-imagem">
                <div class="produto-card-info">
                    <h3 class="produto-card-nome">${produto.nome}</h3>
                    <p class="produto-card-descricao">${produto.descricao || ''}</p>
                    <p class="produto-card-preco">R$ ${parseFloat(produto.preco).toFixed(2)}</p>
                </div>
            `;
            catalogoGrid.appendChild(card);
        });
    }

    function criarBotoesFiltro(categorias) {
        filtrosCategoriaContainer.innerHTML = '';
        
        const btnTodos = document.createElement('button');
        btnTodos.className = 'btn-filtro-categoria active';
        btnTodos.textContent = 'Todos';
        btnTodos.dataset.categoria = 'todos';
        filtrosCategoriaContainer.appendChild(btnTodos);

        categorias.forEach(categoria => {
            const btn = document.createElement('button');
            btn.className = 'btn-filtro-categoria';
            btn.textContent = categoria;
            btn.dataset.categoria = categoria;
            filtrosCategoriaContainer.appendChild(btn);
        });
    }

    // --- FUNÇÕES PRINCIPAIS E EVENTOS ---

    async function carregarCatalogo() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const empresaSlug = urlParams.get('empresa');

            if (!empresaSlug) {
                throw new Error('Empresa não especificada.');
            }

            const response = await fetch(`${API_URL}/api/publico/catalogo/${empresaSlug}`);
            if (!response.ok) {
                throw new Error('Catálogo não encontrado ou indisponível.');
            }
            const data = await response.json();

            document.title = `Catálogo | ${data.nome_empresa}`;
            nomeEmpresaHeader.textContent = data.nome_empresa;
            todosProdutos = data.produtos;

            criarBotoesFiltro(data.categorias);
            renderizarProdutos();

        } catch (error) {
            console.error(error);
            nomeEmpresaHeader.textContent = 'Erro ao Carregar';
            catalogoGrid.innerHTML = `<p>${error.message}</p>`;
        }
    }

    // --- LÓGICA DO LIGHTBOX ---
    catalogoGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.produto-card');
        if (card && card.dataset.imageUrl) {
            lightboxImage.src = card.dataset.imageUrl;
            lightboxOverlay.style.display = 'flex';
        }
    });

    function fecharLightbox() {
        lightboxOverlay.style.display = 'none';
    }

    // --- EVENT LISTENERS ---
    buscaProdutoInput.addEventListener('input', renderizarProdutos);

    filtrosCategoriaContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            document.querySelectorAll('.btn-filtro-categoria').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            categoriaAtiva = event.target.dataset.categoria;
            renderizarProdutos();
        }
    });

    lightboxClose.addEventListener('click', fecharLightbox);
    lightboxOverlay.addEventListener('click', (event) => {
        if (event.target === lightboxOverlay) {
            fecharLightbox();
        }
    });

    // Carrega o catálogo ao iniciar a página
    carregarCatalogo();
});
