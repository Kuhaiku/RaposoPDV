document.addEventListener('DOMContentLoaded', () => {

    const API_URL = '';

    // Mapeamento dos elementos do DOM
    const catalogoGrid = document.getElementById('catalogo-grid');
    const nomeEmpresaHeader = document.getElementById('nome-empresa-header');
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxClose = document.querySelector('.lightbox-close');

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

            const produtos = data.produtos;
            catalogoGrid.innerHTML = ''; 

            if (produtos.length === 0) {
                catalogoGrid.innerHTML = '<p>Nenhum produto disponível no momento. Volte em breve!</p>';
                return;
            }

            produtos.forEach(produto => {
                const card = document.createElement('div');
                card.className = 'produto-card';
                card.dataset.imageUrl = produto.foto_url;
                
                card.innerHTML = `
                    <img src="${produto.foto_url}" alt="${produto.nome}" class="produto-card-imagem">
                    <div class="produto-card-info">
                        <h3 class="produto-card-nome">${produto.nome}</h3>
                        <p class="produto-card-descricao">${produto.descricao || ''}</p>
                        <p class="produto-card-preco">R$ ${parseFloat(produto.preco).toFixed(2)}</p>
                    </div>
                `;
                catalogoGrid.appendChild(card);
            });

        } catch (error) {
            console.error(error);
            nomeEmpresaHeader.textContent = 'Erro ao Carregar';
            catalogoGrid.innerHTML = `<p>${error.message}</p>`;
        }
    }

    // --- LÓGICA DO LIGHTBOX ---
    catalogoGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.produto-card');
        if (card) {
            const imageUrl = card.dataset.imageUrl;
            lightboxImage.src = imageUrl;
            lightboxOverlay.style.display = 'flex';
        }
    });

    function fecharLightbox() {
        lightboxOverlay.style.display = 'none';
    }

    lightboxClose.addEventListener('click', fecharLightbox);
    lightboxOverlay.addEventListener('click', (event) => {
        if (event.target === lightboxOverlay) {
            fecharLightbox();
        }
    });

    // Carrega o catálogo ao iniciar a página
    carregarCatalogo();
});