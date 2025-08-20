checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento dos elementos do DOM
    const logoutBtn = document.getElementById('logout-btn');
    const produtosTableBody = document.getElementById('produtos-table-body');
    const addProdutoForm = document.getElementById('add-produto-form');
    const successMessageDiv = document.getElementById('success-message');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-produto-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const verCatalogoBtn = document.getElementById('ver-catalogo-btn');
    const importCsvBtn = document.getElementById('import-csv-btn');
    const csvFileInput = document.getElementById('csv-file');
    const downloadCsvTemplateBtn = document.getElementById('download-csv-template-btn');

    // Busca o slug da empresa e configura o link do botão
    async function configurarLinkCatalogo() {
        try {
            const response = await fetchWithAuth('/api/empresas/meus-dados');
            if (!response.ok) {
                verCatalogoBtn.style.display = 'none';
                return;
            }
            const data = await response.json();
            
            if (data.slug) {
                verCatalogoBtn.href = `catalogo.html?empresa=${data.slug}`;
            } else {
                verCatalogoBtn.style.display = 'none'; // Esconde o botão se a empresa não tiver slug
            }
        } catch (error) {
            console.error('Erro ao buscar slug da empresa:', error);
            verCatalogoBtn.style.display = 'none';
        }
    }

    // Carrega e exibe a lista de produtos
    async function carregarProdutos() {
        try {
            const response = await fetchWithAuth('/api/produtos');
            if (!response.ok) throw new Error('Erro ao buscar produtos.');
            
            const produtos = await response.json();
            produtosTableBody.innerHTML = ''; 

            produtos.forEach(produto => {
                const tr = document.createElement('tr');
                tr.dataset.produtoId = produto.id; 
                tr.innerHTML = `
                    <td><img src="${produto.foto_url || 'img/placeholder.png'}" alt="${produto.nome}" class="produto-img"></td>
                    <td>${produto.nome}</td>
                    <td>R$ ${parseFloat(produto.preco).toFixed(2)}</td>
                    <td>${produto.estoque}</td>
                    <td>
                        <button class="btn-action btn-edit">Editar</button>
                        <button class="btn-action btn-delete">Inativar</button>
                    </td>
                `;
                produtosTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error(error.message);
            alert('Não foi possível carregar a lista de produtos.');
        }
    }

    // Listener do formulário de adição
    addProdutoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('nome', document.getElementById('nome').value);
        formData.append('preco', document.getElementById('preco').value);
        formData.append('estoque', document.getElementById('estoque').value);
        formData.append('categoria', document.getElementById('categoria').value);
        formData.append('descricao', document.getElementById('descricao').value);
        const imagemInput = document.getElementById('imagem');
        if (imagemInput.files[0]) {
            formData.append('imagem', imagemInput.files[0]);
        }
        try {
            const response = await fetchWithAuth('/api/produtos', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            carregarProdutos();
            addProdutoForm.reset();
            successMessageDiv.textContent = 'Produto salvo com sucesso!';
            setTimeout(() => { successMessageDiv.textContent = ''; }, 3000);
        } catch (error) {
            alert(error.message);
        }
    });

    // Listener do formulário de edição
    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = document.getElementById('edit-produto-id').value;
        const formData = new FormData();
        formData.append('nome', document.getElementById('edit-nome').value);
        formData.append('preco', document.getElementById('edit-preco').value);
        formData.append('estoque', document.getElementById('edit-estoque').value);
        formData.append('categoria', document.getElementById('edit-categoria').value);
        formData.append('descricao', document.getElementById('edit-descricao').value);
        const imagemInput = document.getElementById('edit-imagem');
        if (imagemInput.files[0]) {
            formData.append('imagem', imagemInput.files[0]);
        }
        try {
            const response = await fetchWithAuth(`/api/produtos/${id}`, { method: 'PUT', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            editModal.style.display = 'none';
            carregarProdutos();
        } catch (error) {
            alert(error.message);
        }
    });

    // Listener para os botões da tabela (Editar/Inativar)
    produtosTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const tr = target.closest('tr');
        if (!tr) return;
        const produtoId = tr.dataset.produtoId;

        // Ação de Inativar
        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja INATIVAR este produto? Ele não aparecerá mais para novas vendas.')) {
                try {
                    const response = await fetchWithAuth(`/api/produtos/${produtoId}`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    carregarProdutos();
                } catch (error) {
                    alert(error.message);
                }
            }
        }
        
        // Ação de Editar
        if (target.classList.contains('btn-edit')) {
            try {
                const response = await fetchWithAuth(`/api/produtos/${produtoId}`);
                if (!response.ok) throw new Error('Erro ao buscar dados do produto.');
                
                const produto = await response.json();
                
                document.getElementById('edit-produto-id').value = produto.id;
                document.getElementById('edit-nome').value = produto.nome;
                document.getElementById('edit-preco').value = produto.preco;
                document.getElementById('edit-estoque').value = produto.estoque;
                document.getElementById('edit-categoria').value = produto.categoria;
                document.getElementById('edit-descricao').value = produto.descricao;
                
                editModal.style.display = 'flex';
            } catch (error) {
                alert(error.message);
            }
        }
    });

    // Listener para o botão de importar CSV
    importCsvBtn.addEventListener('click', async () => {
        const file = csvFileInput.files[0];
        if (!file) {
            alert('Por favor, selecione um arquivo CSV.');
            return;
        }

        const formData = new FormData();
        formData.append('csvfile', file);

        try {
            const response = await fetchWithAuth('/api/produtos/importar-csv', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            alert(data.message);
            csvFileInput.value = ''; // Limpa o input do arquivo
            carregarProdutos(); // Recarrega a lista de produtos
        } catch (error) {
            alert(`Erro ao importar: ${error.message}`);
        }
    });

    // Listener para o botão de baixar modelo CSV
    downloadCsvTemplateBtn.addEventListener('click', () => {
        const csvContent = "nome,preco,estoque,categoria,descricao\n" +
            "Camiseta Basica Branca,49.90,10,Roupas,Camiseta de algodão PIMA.\n" +
            "Calça Jeans,129.90,5,Roupas,Calça jeans azul, lavagem escura.\n";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "modelo_produtos.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Listeners gerais
    cancelEditBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
    logoutBtn.addEventListener('click', logout);
    
    // Inicialização da página
    carregarProdutos();
    configurarLinkCatalogo();
});
