checkAuth();

document.addEventListener('DOMContentLoaded', () => {
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
    const btnOrdenacao = document.getElementById('btn-ordenacao');
    const textoOrdenacao = document.getElementById('texto-ordenacao');

    // CAMPOS DOS GERENCIADORES DE FOTOS
    const addFileInput = document.getElementById('imagem');
    const addPreviewsContainer = document.getElementById('add-previews');
    const editFileInput = document.getElementById('edit-imagem');
    const editPreviewsContainer = document.getElementById('edit-previews');
    let fotosParaRemover = [];

    // LÓGICA DO INPUT CSV
    const csvFileNameSpan = document.getElementById('csv-file-name');
    csvFileInput.addEventListener('change', () => {
        if (csvFileInput.files.length > 0) {
            csvFileNameSpan.textContent = csvFileInput.files[0].name;
            csvFileNameSpan.style.fontStyle = 'normal';
        } else {
            csvFileNameSpan.textContent = 'Nenhum arquivo selecionado';
            csvFileNameSpan.style.fontStyle = 'italic';
        }
    });

    const selecionarTodosCheck = document.getElementById('selecionar-todos');
    const inativarMassaBtn = document.getElementById('inativar-massa-btn');
    const excluirMassaBtn = document.getElementById('excluir-massa-btn');

    const estadosOrdenacao = [
        { id: 'nome-asc', texto: 'Ordem Alfabética', icone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41zm255-105L177 64c-9.4-9.4-24.6-9.4-33.9 0L24 183c-15.1 15.1-4.4 41 17 41h238c21.4 0 32.1 25.9 17-41z"/></svg>` },
        { id: 'preco-desc', texto: 'Maior Preço', icone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z"/></svg>` },
        { id: 'preco-asc', texto: 'Menor Preço', icone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M279 224H41c-21.4 0-32.1-25.9-17-41L143 64c9.4-9.4 24.6-9.4 33.9 0l119 119c15.2 15.1 4.5 41-16.9 41z"/></svg>` },
        { id: 'id-desc', texto: 'Mais Recentes', icone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M96 32V64H48C21.5 64 0 85.5 0 112v48H448V112c0-26.5-21.5-48-48-48H352V32c0-17.7-14.3-32-32-32s-32 14.3-32 32V64H160V32c0-17.7-14.3-32-32-32S96 14.3 96 32zM448 192H0V464c0 26.5 21.5 48 48 48H400c26.5 0 48-21.5 48-48V192zM224 340c-6.8 0-13.3 1.6-19.2 4.6l-48 24c-11.2 5.6-15.3 19.3-9.8 30.5s19.3 15.3 30.5 9.8l26-13V424c0 13.3 10.7 24 24 24s24-10.7 24-24V381.5l26 13c11.2 5.6 24.9 1.5 30.5-9.8s1.5-24.9-9.8-30.5l-48-24c-5.9-3-12.4-4.6-19.2-4.6z"/></svg>` },
        { id: 'id-asc', texto: 'Mais Antigos', icone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M96 32V64H48C21.5 64 0 85.5 0 112v48H448V112c0-26.5-21.5-48-48-48H352V32c0-17.7-14.3-32-32-32s-32 14.3-32 32V64H160V32c0-17.7-14.3-32-32-32S96 14.3 96 32zM448 192H0V464c0 26.5 21.5 48 48 48H400c26.5 0 48-21.5 48-48V192zM224 276c-6.8 0-13.3-1.6-19.2-4.6l-48-24c-11.2-5.6-15.3-19.3-9.8-30.5s19.3-15.3 30.5-9.8l26 13V200c0-13.3 10.7 24 24 24s24 10.7 24-24v20.5l26-13c11.2-5.6 24.9-1.5 30.5 9.8s1.5 24.9-9.8 30.5l-48 24c-5.9 3-12.4 4.6-19.2 4.6z"/></svg>` },
    ];
    let indiceOrdenacaoAtual = 0;

    // --- FUNÇÕES DE PRÉ-VISUALIZAÇÃO DE IMAGEM ---
    function criarPreview(file, container) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'foto-preview relative w-[100px] h-[100px] rounded-lg overflow-hidden'; // Ajustado Tailwind
            // Ajustado Tailwind para botão
            div.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}" class="w-full h-full object-cover">
                <button type="button" class="btn-remover-foto absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs font-bold leading-none" title="Remover esta imagem">&times;</button>
            `;
            container.appendChild(div);
            // Certifica que o botão de remover funciona
            div.querySelector('.btn-remover-foto').addEventListener('click', (ev) => {
                ev.stopPropagation(); // Impede outros cliques
                div.remove();
                // Limpa o input se remover a última foto (ou ajusta conforme necessidade)
                // Se for o input de adicionar, pode ser necessário recriar o FileList se quiser reenviar as restantes
            });
        };
        reader.readAsDataURL(file);
    }

    addFileInput.addEventListener('change', (event) => {
        addPreviewsContainer.innerHTML = ''; // Limpa previews antigos ao selecionar novos arquivos
        if (event.target.files) {
            for (const file of event.target.files) {
                criarPreview(file, addPreviewsContainer);
            }
        }
    });

    editFileInput.addEventListener('change', (event) => {
         // Não limpa, apenas adiciona novos previews
        if (event.target.files) {
            for (const file of event.target.files) {
                criarPreview(file, editPreviewsContainer);
            }
        }
    });
    // --- FIM FUNÇÕES DE PRÉ-VISUALIZAÇÃO ---

    function atualizarBotaoOrdenacao() {
        const estado = estadosOrdenacao[indiceOrdenacaoAtual];
        btnOrdenacao.innerHTML = estado.icone;
        textoOrdenacao.textContent = estado.texto;
        btnOrdenacao.title = `Ordenar por: ${estado.texto}`;
    }

    function obterIdsSelecionados() {
        const checkboxes = produtosTableBody.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.closest('tr').dataset.produtoId));
    }

    async function carregarProdutos() {
        try {
            const ordenacaoAtualId = estadosOrdenacao[indiceOrdenacaoAtual].id;
            const response = await fetchWithAuth(`/api/produtos?sortBy=${ordenacaoAtualId}`);
            if (!response.ok) throw new Error('Erro ao buscar produtos.');

            const produtos = await response.json();
            produtosTableBody.innerHTML = '';

            if (produtos.length === 0) {
                 produtosTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">Nenhum produto ativo encontrado.</td></tr>`;
                 return;
            }

            produtos.forEach(produto => {
                const tr = document.createElement('tr');
                tr.dataset.produtoId = produto.id;
                // Adiciona padding, borda e hover:bg
                tr.className = 'border-b dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50';
                tr.innerHTML = `
                    <td class="px-4 py-2 text-center"><input type="checkbox" class="produto-checkbox form-checkbox rounded text-primary focus:ring-primary/50" data-id="${produto.id}"></td>
                    <td class="px-4 py-2"><img src="${produto.foto_url || 'img/placeholder.png'}" alt="${produto.nome}" class="produto-img w-12 h-12 object-cover rounded border dark:border-zinc-700"></td>
                    <td class="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">${produto.codigo || 'N/A'}</td>
                    <td class="px-4 py-2 font-medium text-secondary dark:text-zinc-100">${produto.nome}</td>
                    <td class="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">R$ ${parseFloat(produto.preco).toFixed(2)}</td>
                    <td class="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">${produto.estoque}</td>
                    <td class="px-4 py-2 text-sm space-x-2 whitespace-nowrap">
                        <button class="btn-action btn-edit inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Editar</button>
                        <button class="btn-action btn-delete inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">Inativar</button>
                    </td>
                `;
                produtosTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error(error.message);
            produtosTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Falha ao carregar produtos. Tente novamente.</td></tr>`;
            // alert('Não foi possível carregar a lista de produtos.'); // Já mostra no console e na tabela
        }
    }

    btnOrdenacao.addEventListener('click', () => {
        indiceOrdenacaoAtual = (indiceOrdenacaoAtual + 1) % estadosOrdenacao.length;
        atualizarBotaoOrdenacao();
        carregarProdutos();
    });

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
                verCatalogoBtn.style.display = 'inline-flex'; // Garante que está visível
            } else {
                verCatalogoBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao buscar slug da empresa:', error);
            verCatalogoBtn.style.display = 'none';
        }
    }

    // --- SUBMIT DO FORMULÁRIO DE ADICIONAR PRODUTO (AJUSTADO) ---
    addProdutoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        successMessageDiv.textContent = ''; // Limpa mensagens anteriores

        // Cria o FormData e adiciona campos manualmente
        const formData = new FormData();
        formData.append('nome', document.getElementById('nome').value);
        formData.append('codigo', document.getElementById('codigo').value);
        formData.append('preco', document.getElementById('preco').value);
        formData.append('estoque', document.getElementById('estoque').value);
        formData.append('categoria', document.getElementById('categoria').value);
        formData.append('descricao', document.getElementById('descricao').value);

        // Adiciona os arquivos de imagem selecionados
        const imageInput = document.getElementById('imagem');
        if (imageInput.files) {
            for (let i = 0; i < imageInput.files.length; i++) {
                // A chave 'imagens' DEVE corresponder ao esperado pelo Multer no backend
                formData.append('imagens', imageInput.files[i]);
            }
        }

        // Log para depuração (ver no console do navegador)
        console.log('--- Enviando FormData para criar produto ---');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}:`, value instanceof File ? value.name : value);
        }

        try {
            const response = await fetchWithAuth('/api/produtos', {
                method: 'POST',
                body: formData // Envia o objeto FormData
                // O Content-Type é definido automaticamente pelo navegador para FormData
            });
            const data = await response.json();

            if (!response.ok) {
                console.error('Erro do servidor ao criar produto:', data);
                throw new Error(data.message || `Erro ${response.status} ao salvar produto.`);
            }

            // Sucesso
            addProdutoForm.reset(); // Limpa o formulário
            addPreviewsContainer.innerHTML = ''; // Limpa os previews
            successMessageDiv.textContent = 'Produto salvo com sucesso!';
            successMessageDiv.classList.remove('text-red-600'); // Garante estilo de sucesso
            successMessageDiv.classList.add('text-green-600');
            setTimeout(() => { successMessageDiv.textContent = ''; }, 3000);
            carregarProdutos(); // Recarrega a lista
        } catch (error) {
            console.error('Falha ao enviar formulário:', error);
            successMessageDiv.textContent = `Erro: ${error.message}`; // Mostra erro
            successMessageDiv.classList.remove('text-green-600');
            successMessageDiv.classList.add('text-red-600'); // Estilo de erro
            // alert(`Erro ao salvar produto: ${error.message}`); // Já mostra no successMessageDiv
        }
    });
    // --- FIM SUBMIT ADICIONAR ---

    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = document.getElementById('edit-produto-id').value;
        const formData = new FormData(); // Usar FormData para PUT também por causa das imagens

        // Campos de texto
        formData.append('nome', document.getElementById('edit-nome').value);
        formData.append('codigo', document.getElementById('edit-codigo').value);
        formData.append('preco', document.getElementById('edit-preco').value);
        formData.append('estoque', document.getElementById('edit-estoque').value);
        formData.append('categoria', document.getElementById('edit-categoria').value);
        formData.append('descricao', document.getElementById('edit-descricao').value);
        // Array de fotos a remover (enviado como string JSON)
        formData.append('fotosParaRemover', JSON.stringify(fotosParaRemover));

        // Novas imagens adicionadas
        const editImageInput = document.getElementById('edit-imagem');
        if (editImageInput.files) {
            for (let i = 0; i < editImageInput.files.length; i++) {
                formData.append('imagens', editImageInput.files[i]); // Chave 'imagens'
            }
        }

        console.log('--- Enviando FormData para atualizar produto ---');
        for (let [key, value] of formData.entries()) {
             console.log(`${key}:`, value instanceof File ? value.name : value);
        }


        try {
            const response = await fetchWithAuth(`/api/produtos/${id}`, {
                 method: 'PUT',
                 body: formData
                 // Content-Type é automático para FormData
            });
            const data = await response.json();
            if (!response.ok) {
                 console.error('Erro do servidor ao atualizar produto:', data);
                 throw new Error(data.message || `Erro ${response.status} ao atualizar produto.`);
            }

            editModal.style.display = 'none';
            carregarProdutos();
            fotosParaRemover = []; // Limpa o array após sucesso
        } catch (error) {
            console.error('Falha ao atualizar produto:', error);
            alert(`Erro ao atualizar produto: ${error.message}`);
        }
    });

    // Eventos na tabela (Editar, Inativar)
    produtosTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const tr = target.closest('tr');
        if (!tr || !tr.dataset.produtoId) return; // Sai se não clicou em uma linha válida

        const produtoId = tr.dataset.produtoId;

        // Botão Editar
        if (target.classList.contains('btn-edit')) {
            try {
                editForm.reset(); // Limpa form
                editPreviewsContainer.innerHTML = ''; // Limpa previews
                fotosParaRemover = []; // Limpa array de remoção
                editFileInput.value = ''; // Limpa seleção de arquivos

                const response = await fetchWithAuth(`/api/produtos/${produtoId}`);
                if (!response.ok) throw new Error('Erro ao buscar dados do produto.');
                const produto = await response.json();

                // Preenche campos do formulário de edição
                document.getElementById('edit-produto-id').value = produto.id;
                document.getElementById('edit-nome').value = produto.nome || '';
                document.getElementById('edit-codigo').value = produto.codigo || '';
                document.getElementById('edit-preco').value = produto.preco || '';
                document.getElementById('edit-estoque').value = produto.estoque || '';
                document.getElementById('edit-categoria').value = produto.categoria || '';
                document.getElementById('edit-descricao').value = produto.descricao || '';

                // Renderiza previews das fotos existentes
                if (produto.fotos && Array.isArray(produto.fotos)) {
                    produto.fotos.forEach(foto => {
                        const div = document.createElement('div');
                         // Usa Tailwind para layout e botão
                        div.className = 'foto-preview relative w-[100px] h-[100px] rounded-lg overflow-hidden border dark:border-zinc-700';
                        div.innerHTML = `
                            <img src="${foto.url}" alt="Preview" class="w-full h-full object-cover">
                            <button type="button" class="btn-remover-foto-existente absolute top-1 right-1 w-5 h-5 bg-red-600/80 text-white rounded-full flex items-center justify-center text-xs font-bold leading-none hover:bg-red-700" title="Remover imagem salva">&times;</button>
                        `;
                        editPreviewsContainer.appendChild(div);

                        // Adiciona evento para marcar foto para remoção
                        div.querySelector('.btn-remover-foto-existente').addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            // Adiciona ao array para enviar ao backend
                            fotosParaRemover.push({ id: foto.id, public_id: foto.public_id });
                            div.remove(); // Remove o preview da tela
                             console.log("Fotos marcadas para remover:", fotosParaRemover);
                        });
                    });
                }

                editModal.style.display = 'flex'; // Abre o modal
            } catch (error) {
                console.error("Erro ao abrir modal de edição:", error);
                alert(`Não foi possível carregar os dados para edição: ${error.message}`);
            }
        }

        // Botão Inativar (anteriormente btn-delete)
        if (target.classList.contains('btn-delete')) {
             if (confirm('Tem certeza que deseja INATIVAR este produto? Ele não aparecerá mais para novas vendas, mas ficará no histórico.')) {
                try {
                    // O endpoint DELETE agora significa INATIVAR no backend
                    const response = await fetchWithAuth(`/api/produtos/${produtoId}`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    carregarProdutos(); // Recarrega a lista para remover o inativado
                } catch (error) {
                     console.error("Erro ao inativar produto:", error);
                    alert(`Erro ao inativar produto: ${error.message}`);
                }
            }
        }
    });

    // Checkbox "Selecionar Todos"
    selecionarTodosCheck.addEventListener('change', (event) => {
        produtosTableBody.querySelectorAll('.produto-checkbox').forEach(cb => {
            cb.checked = event.target.checked;
        });
    });

    // Botão Inativar em Massa
    inativarMassaBtn.addEventListener('click', async () => {
        const ids = obterIdsSelecionados();
        if (ids.length === 0) {
            alert('Selecione pelo menos um produto para inativar.');
            return;
        }
        if (!confirm(`Tem certeza que deseja inativar ${ids.length} produto(s)? Eles serão removidos da lista de produtos ativos.`)) {
            return;
        }
        try {
            const response = await fetchWithAuth('/api/produtos/inativar-em-massa', {
                method: 'PUT',
                body: JSON.stringify({ ids }) // Envia como JSON
                 // Content-Type 'application/json' será adicionado por fetchWithAuth
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            alert(data.message);
            carregarProdutos();
            selecionarTodosCheck.checked = false; // Desmarca o "selecionar todos"
        } catch (error) {
             console.error("Erro ao inativar em massa:", error);
            alert(`Erro ao inativar produtos: ${error.message}`);
        }
    });

    // Botão Excluir em Massa
    excluirMassaBtn.addEventListener('click', async () => {
        const ids = obterIdsSelecionados();
        if (ids.length === 0) {
            alert('Selecione pelo menos um produto para excluir permanentemente.');
            return;
        }
        if (!confirm(`ATENÇÃO! Excluir ${ids.length} produto(s) permanentemente? Esta ação NÃO PODE ser desfeita e só funciona para produtos SEM vendas associadas.`)) {
            return;
        }
        try {
            const response = await fetchWithAuth('/api/produtos/excluir-em-massa', {
                method: 'POST', // Método POST para exclusão em massa conforme rota
                body: JSON.stringify({ ids })
                 // Content-Type 'application/json'
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            alert(data.message);
            carregarProdutos();
            selecionarTodosCheck.checked = false;
        } catch (error) {
             console.error("Erro ao excluir em massa:", error);
            alert(`Erro ao excluir produtos: ${error.message}`);
        }
    });

    // Botão Importar CSV
    importCsvBtn.addEventListener('click', async () => {
        const file = csvFileInput.files[0];
        if (!file) {
            alert('Por favor, selecione um arquivo CSV.');
            return;
        }
        const formData = new FormData();
        formData.append('csvfile', file); // Nome deve corresponder ao Multer 'uploadCsv'
        try {
            // Usa fetchWithAuth que agora lida com FormData corretamente
            const response = await fetchWithAuth('/api/produtos/importar-csv', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            alert(data.message);
            // Limpa o input e o nome do arquivo
            csvFileInput.value = ''; // Reseta o input file
            csvFileNameSpan.textContent = 'Nenhum arquivo selecionado';
            csvFileNameSpan.style.fontStyle = 'italic';
            carregarProdutos(); // Recarrega a lista
        } catch (error) {
             console.error("Erro ao importar CSV:", error);
            alert(`Erro ao importar: ${error.message}`);
        }
    });


    // Botão Baixar Modelo CSV
    downloadCsvTemplateBtn.addEventListener('click', () => {
        const csvContent = "nome,codigo,preco,estoque,descricao,categoria,foto_url,foto_public_id\n" + // Headers corretos
             "Exemplo Produto A,COD001,49.90,25,Camiseta de algodão confortável,Roupas,https://via.placeholder.com/150/0000FF/FFFFFF?text=FotoA,\n" + // Exemplo 1
             "Exemplo Produto B,COD002,120.00,10,Calça jeans azul moderna,Roupas,https://via.placeholder.com/150/FF0000/FFFFFF?text=FotoB,\n"; // Exemplo 2
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "modelo_importacao_produtos.csv"); // Nome mais descritivo
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Libera memória
    });

    // Botão Cancelar Edição (Modal)
    cancelEditBtn.addEventListener('click', () => {
        editForm.reset();
        editModal.style.display = 'none';
        fotosParaRemover = []; // Limpa array ao cancelar
    });

    // Logout (verifica se o botão existe)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    } else {
         const sidebarFooter = document.querySelector('.sidebar-footer');
         if (sidebarFooter) {
              const logoutBtnInFooter = sidebarFooter.querySelector('.btn-logout');
              if (logoutBtnInFooter) logoutBtnInFooter.addEventListener('click', logout);
         }
    }


    // --- INICIALIZAÇÃO ---
    atualizarBotaoOrdenacao();
    carregarProdutos();
    configurarLinkCatalogo();
});
