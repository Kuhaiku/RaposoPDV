// Garante que checkAuth e fetchWithAuth estão disponíveis (de auth.js)
if (typeof checkAuth !== 'function' || typeof fetchWithAuth !== 'function') {
    console.error("Funções 'checkAuth' ou 'fetchWithAuth' não encontradas. Verifique se auth.js foi carregado corretamente.");
    // Poderia redirecionar para login ou mostrar erro
} else {
    checkAuth();
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos DOM ---
    const productListContainer = document.getElementById('product-list-container');
    const productListPlaceholder = document.getElementById('product-list-placeholder');
    const searchInput = document.getElementById('search-input');
    const tabAtivos = document.getElementById('tab-ativos');
    const tabInativos = document.getElementById('tab-inativos');
    const addProductButton = document.getElementById('add-product-button');

    // --- Modais ---
    const addProductPopup = document.getElementById('add-product-popup');
    const editProductPopup = document.getElementById('edit-product-popup');
    const addProductForm = document.getElementById('add-product-form');
    const editProductForm = document.getElementById('edit-product-form');

    // --- Campos do Formulário ADD ---
    const addImageInput = document.getElementById('add-images-input');
    const addImagePreviews = document.getElementById('add-image-previews');
    const addProductMessage = document.getElementById('add-product-message');

    // --- Campos do Formulário EDIT ---
    const editProductIdInput = document.getElementById('edit-product-id');
    const editProductNameInput = document.getElementById('edit-product-name');
    const editProductCodigoInput = document.getElementById('edit-product-codigo');
    const editProductPrecoInput = document.getElementById('edit-product-preco');
    const editProductEstoqueInput = document.getElementById('edit-product-estoque');
    const editProductCategoriaInput = document.getElementById('edit-product-categoria');
    const editProductDescricaoInput = document.getElementById('edit-product-descricao');
    const editImageInput = document.getElementById('edit-images-input');
    const editImagePreviews = document.getElementById('edit-image-previews');
    const editProductMessage = document.getElementById('edit-product-message');

    // --- Estado ---
    let todosProdutos = []; // Armazena todos os produtos (ativos e inativos)
    let filtroAtual = 'ativos'; // 'ativos' ou 'inativos'
    let termoBusca = '';
    let fotosParaRemoverEdit = []; // Armazena fotos a serem removidas na edição [{id: 1, public_id: 'abc'}, ...]
    let addProductFiles = []; // Armazena arquivos selecionados para adicionar
    let editProductFiles = []; // Armazena novos arquivos selecionados para editar

    // --- Funções Auxiliares ---

    // Formata moeda
    const formatCurrency = (value) => {
        const number = parseFloat(value) || 0;
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Exibe mensagem nos modais
    const showModalMessage = (element, message, isError = false) => {
        element.textContent = message;
        element.classList.remove('hidden', 'text-green-600', 'text-red-600');
        element.classList.add(isError ? 'text-red-600' : 'text-green-600');
    };

    // Limpa mensagem dos modais
    const clearModalMessage = (element) => {
        element.textContent = '';
        element.classList.add('hidden');
    };

    // Abre um modal (bottom sheet)
    const openPopup = (popupElement) => {
        if (popupElement) {
            popupElement.classList.add('is-open');
            // Opcional: impedir scroll do body
            document.body.style.overflow = 'hidden';
        }
    };

    // Fecha um modal (bottom sheet)
    const closePopup = (popupElement) => {
        if (popupElement) {
            popupElement.classList.remove('is-open');
            // Opcional: restaurar scroll do body
            document.body.style.overflow = '';
            // Limpa mensagens de erro/sucesso ao fechar
            clearModalMessage(addProductMessage);
            clearModalMessage(editProductMessage);
        }
    };

    // --- Funções de Pré-visualização de Imagem ---
    const handleFileChange = (event, previewContainer, fileStorage) => {
        // Limpa previews ANTES de adicionar os novos selecionados
        previewContainer.querySelectorAll('.image-preview').forEach(preview => preview.remove());
        fileStorage.length = 0; // Limpa o array de arquivos

        const files = event.target.files;
        if (!files) return;

        // Limita a 5 arquivos (ou quantos o backend suportar)
        const filesToProcess = Array.from(files).slice(0, 5);

        filesToProcess.forEach(file => {
            fileStorage.push(file); // Armazena o arquivo
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'image-preview'; // Tailwind classes já definidas no HTML/CSS
                div.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button type="button" class="remove-image-btn" title="Remover imagem">&times;</button>
                `;
                // Insere antes do botão '+'
                previewContainer.insertBefore(div, previewContainer.querySelector('.add-image-btn'));

                div.querySelector('.remove-image-btn').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    // Remove o preview
                    div.remove();
                    // Remove o arquivo correspondente do array de storage
                    const indexToRemove = fileStorage.indexOf(file);
                    if (indexToRemove > -1) {
                        fileStorage.splice(indexToRemove, 1);
                    }
                    // Limpa o input file para permitir selecionar o mesmo arquivo novamente se removido
                    event.target.value = null; // IMPORTANTE!
                });
            };
            reader.readAsDataURL(file);
        });
        // Atualiza o input file caso tenhamos limitado os arquivos (slice)
        // Isso é complexo de fazer diretamente, então limpamos e deixamos o usuário selecionar de novo se precisar.
        // A melhor abordagem é validar no backend.
        if (files.length > 5) {
             alert("Você pode selecionar no máximo 5 imagens.");
             // Limpa a seleção e os previews para forçar nova seleção
             previewContainer.querySelectorAll('.image-preview').forEach(preview => preview.remove());
             fileStorage.length = 0;
             event.target.value = null; // Limpa o input file
        }
    };

    // Listener para o input de adicionar imagens
    addImageInput.addEventListener('change', (event) => handleFileChange(event, addImagePreviews, addProductFiles));

    // Listener para o input de editar imagens
    editImageInput.addEventListener('change', (event) => handleFileChange(event, editImagePreviews, editProductFiles));


    // --- Funções Principais ---

    // Carrega TODOS os produtos (ativos e inativos) da API
    const carregarTodosProdutos = async () => {
        productListPlaceholder.textContent = 'Carregando produtos...';
        productListPlaceholder.classList.remove('hidden');
        productListContainer.innerHTML = ''; // Limpa a lista atual

        try {
            // Ajusta o endpoint para buscar todos ou implementa um novo endpoint se necessário
            // Vamos assumir que /api/produtos sem filtro traz ativos e /api/produtos/inativos traz inativos
            const [ativosRes, inativosRes] = await Promise.all([
                fetchWithAuth('/api/produtos'),
                fetchWithAuth('/api/produtos/inativos')
            ]);

            if (!ativosRes.ok || !inativosRes.ok) {
                throw new Error('Falha ao carregar lista de produtos.');
            }

            const ativos = await ativosRes.json();
            const inativos = await inativosRes.json();

            // Adiciona um marcador 'ativo' para facilitar a filtragem
            todosProdutos = [
                ...ativos.map(p => ({ ...p, ativo: true })),
                ...inativos.map(p => ({ ...p, ativo: false }))
            ];

             // Ordena inicialmente por nome (ou pelo critério padrão)
             todosProdutos.sort((a, b) => a.nome.localeCompare(b.nome));


            renderizarProdutos(); // Renderiza a lista filtrada inicial (ativos)

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            productListPlaceholder.textContent = 'Erro ao carregar produtos. Tente novamente.';
            productListPlaceholder.classList.remove('hidden');
            todosProdutos = []; // Limpa em caso de erro
        }
    };

    // Renderiza a lista de produtos na tela com base nos filtros
    const renderizarProdutos = () => {
        productListContainer.innerHTML = ''; // Limpa a lista
        productListPlaceholder.classList.add('hidden'); // Esconde placeholder

        const produtosFiltrados = todosProdutos.filter(p => {
            const correspondeStatus = (filtroAtual === 'ativos' && p.ativo) || (filtroAtual === 'inativos' && !p.ativo);
            const correspondeBusca = termoBusca === '' ||
                                     p.nome.toLowerCase().includes(termoBusca) ||
                                     (p.codigo && p.codigo.toLowerCase().includes(termoBusca));
            return correspondeStatus && correspondeBusca;
        });

        if (produtosFiltrados.length === 0) {
            productListPlaceholder.textContent = `Nenhum produto ${filtroAtual} encontrado ${termoBusca ? 'para "' + termoBusca + '"' : ''}.`;
            productListPlaceholder.classList.remove('hidden');
            return;
        }

        produtosFiltrados.forEach(produto => {
            const card = document.createElement('div');
            card.className = `flex items-start gap-3 bg-white dark:bg-zinc-900 rounded-lg p-3 shadow-sm product-card ${!produto.ativo ? 'opacity-60' : ''}`;
            card.dataset.produtoId = produto.id;

            card.innerHTML = `
                <img class="rounded-lg size-16 object-cover border dark:border-zinc-700 flex-shrink-0" src="${produto.foto_url || 'img/placeholder.png'}" alt="${produto.nome}"/>
                <div class="flex-1 min-w-0">
                    <p class="text-secondary dark:text-white text-base font-semibold leading-tight truncate" title="${produto.nome}">${produto.nome}</p>
                    <p class="text-zinc-500 dark:text-zinc-400 text-sm font-normal">SKU: ${produto.codigo || 'N/A'}</p>
                    <p class="text-${produto.ativo ? 'primary' : 'zinc-500 dark:text-zinc-400'} font-bold text-base mt-1">${formatCurrency(produto.preco)}</p>
                    <p class="text-xs text-zinc-400">Estoque: ${produto.estoque}</p>
                </div>
                <div class="flex flex-col items-end gap-1 flex-shrink-0">
                    <button class="btn-edit flex items-center justify-center rounded-lg h-7 px-2 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                        <span class="material-symbols-outlined mr-1 text-sm">edit</span> Editar
                    </button>
                    ${produto.ativo ? `
                        <button class="btn-inativar flex items-center justify-center rounded-lg h-7 px-2 bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors">
                            <span class="material-symbols-outlined mr-1 text-sm">visibility_off</span> Inativar
                        </button>
                    ` : `
                        <button class="btn-ativar flex items-center justify-center rounded-lg h-7 px-2 bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">
                            <span class="material-symbols-outlined mr-1 text-sm">visibility</span> Ativar
                        </button>
                        <button class="btn-excluir-perm flex items-center justify-center rounded-lg h-7 px-2 bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors mt-1" title="Excluir Permanentemente">
                            <span class="material-symbols-outlined mr-1 text-sm">delete_forever</span> Excluir
                        </button>
                    `}
                </div>
            `;
            productListContainer.appendChild(card);
        });
    };

    // --- Tratamento de Eventos ---

    // Busca
    searchInput.addEventListener('input', () => {
        termoBusca = searchInput.value.toLowerCase();
        renderizarProdutos();
    });

    // Abas Ativos/Inativos
    const handleTabClick = (tabId) => {
        filtroAtual = tabId;
        tabAtivos.classList.toggle('active', tabId === 'ativos');
        tabInativos.classList.toggle('active', tabId === 'inativos');
        renderizarProdutos();
    };
    tabAtivos.addEventListener('click', () => handleTabClick('ativos'));
    tabInativos.addEventListener('click', () => handleTabClick('inativos'));

    // Abrir Modal Adicionar
    addProductButton.addEventListener('click', () => {
        addProductForm.reset();
        addImagePreviews.innerHTML = `
            <label for="add-images-input" class="add-image-btn">
                <span class="material-symbols-outlined text-4xl">add_photo_alternate</span>
            </label>`; // Limpa previews e recoloca o botão '+'
        addProductFiles = []; // Limpa array de arquivos
        addImageInput.value = null; // Limpa o input file
        clearModalMessage(addProductMessage);
        openPopup(addProductPopup);
    });

    // Submeter Formulário Adicionar
    addProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearModalMessage(addProductMessage);
        const submitButton = addProductForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        const formData = new FormData();
        // Adiciona campos do form ao FormData
        formData.append('nome', document.getElementById('add-product-name').value);
        formData.append('codigo', document.getElementById('add-product-codigo').value);
        formData.append('preco', document.getElementById('add-product-preco').value);
        formData.append('estoque', document.getElementById('add-product-estoque').value);
        formData.append('categoria', document.getElementById('add-product-categoria').value);
        formData.append('descricao', document.getElementById('add-product-descricao').value);

        // Adiciona arquivos do array 'addProductFiles'
        addProductFiles.forEach(file => {
            formData.append('imagens', file); // A chave deve ser 'imagens'
        });

        try {
            const response = await fetchWithAuth('/api/produtos', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao salvar.');

            showModalMessage(addProductMessage, 'Produto salvo com sucesso!');
            await carregarTodosProdutos(); // Recarrega a lista completa
            setTimeout(() => {
                closePopup(addProductPopup);
                addProductForm.reset(); // Limpa form após fechar
                addImagePreviews.innerHTML = `<label for="add-images-input" class="add-image-btn"><span class="material-symbols-outlined text-4xl">add_photo_alternate</span></label>`;
                addProductFiles = [];
                addImageInput.value = null;
            }, 1500); // Fecha após 1.5s

        } catch (error) {
            console.error("Erro ao adicionar produto:", error);
            showModalMessage(addProductMessage, `Erro: ${error.message}`, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Produto';
        }
    });

     // Submeter Formulário Editar
    editProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearModalMessage(editProductMessage);
        const submitButton = editProductForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        const id = editProductIdInput.value;
        const formData = new FormData();

        // Adiciona campos do form
        formData.append('nome', editProductNameInput.value);
        formData.append('codigo', editProductCodigoInput.value);
        formData.append('preco', editProductPrecoInput.value);
        formData.append('estoque', editProductEstoqueInput.value);
        formData.append('categoria', editProductCategoriaInput.value);
        formData.append('descricao', editProductDescricaoInput.value);

        // Adiciona array de fotos a remover como string JSON
        formData.append('fotosParaRemover', JSON.stringify(fotosParaRemoverEdit));

        // Adiciona NOVOS arquivos selecionados
        editProductFiles.forEach(file => {
            formData.append('imagens', file); // Chave 'imagens'
        });

        try {
            const response = await fetchWithAuth(`/api/produtos/${id}`, {
                method: 'PUT',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao atualizar.');

            showModalMessage(editProductMessage, 'Produto atualizado com sucesso!');
            await carregarTodosProdutos(); // Recarrega tudo
            setTimeout(() => {
                 closePopup(editProductPopup);
                 // Limpezas não são estritamente necessárias aqui se o modal é repopulado ao abrir
            }, 1500);

        } catch (error) {
            console.error("Erro ao editar produto:", error);
            showModalMessage(editProductMessage, `Erro: ${error.message}`, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Alterações';
        }
    });


    // Eventos nos Cards de Produto (Editar, Inativar, Ativar, Excluir) - Delegação
    productListContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const card = button.closest('.product-card');
        if (!card || !card.dataset.produtoId) return;

        const produtoId = card.dataset.produtoId;
        const produto = todosProdutos.find(p => p.id == produtoId); // Usa == para comparar string com número se necessário
        if(!produto) return;

        // --- Botão Editar ---
        if (button.classList.contains('btn-edit')) {
            editProductForm.reset();
            editImagePreviews.innerHTML = `<label for="edit-images-input" class="add-image-btn"><span class="material-symbols-outlined text-4xl">add_photo_alternate</span></label>`; // Limpa e adiciona botão '+'
            fotosParaRemoverEdit = [];
            editProductFiles = [];
            editImageInput.value = null; // Limpa seleção
            clearModalMessage(editProductMessage);

            try {
                // Busca detalhes atualizados (incluindo array de fotos completo)
                const response = await fetchWithAuth(`/api/produtos/${produtoId}`);
                if (!response.ok) throw new Error('Falha ao buscar detalhes do produto.');
                const produtoDetalhado = await response.json();

                // Preenche o formulário de edição
                editProductIdInput.value = produtoDetalhado.id;
                editProductNameInput.value = produtoDetalhado.nome || '';
                editProductCodigoInput.value = produtoDetalhado.codigo || '';
                editProductPrecoInput.value = produtoDetalhado.preco || '';
                editProductEstoqueInput.value = produtoDetalhado.estoque || '';
                editProductCategoriaInput.value = produtoDetalhado.categoria || '';
                editProductDescricaoInput.value = produtoDetalhado.descricao || '';

                // Renderiza previews das fotos existentes
                if (produtoDetalhado.fotos && Array.isArray(produtoDetalhado.fotos)) {
                    produtoDetalhado.fotos.forEach(foto => {
                         if (!foto || !foto.url) return; // Pula se a foto for inválida
                        const div = document.createElement('div');
                        div.className = 'image-preview';
                        div.innerHTML = `
                            <img src="${foto.url}" alt="Preview">
                            <button type="button" class="remove-image-btn existing-photo" title="Remover imagem salva">&times;</button>
                        `;
                         // Armazena dados da foto no botão para fácil acesso
                         const removeBtn = div.querySelector('.remove-image-btn');
                         removeBtn.dataset.fotoId = foto.id; // ID da tabela produto_fotos
                         removeBtn.dataset.publicId = foto.public_id; // public_id do Cloudinary

                        editImagePreviews.insertBefore(div, editImagePreviews.querySelector('.add-image-btn'));

                        removeBtn.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            const fotoId = ev.target.dataset.fotoId;
                            const publicId = ev.target.dataset.publicId;

                            // Adiciona à lista de remoção APENAS se tiver dados válidos
                             if (fotoId !== 'null' && publicId) { // Verifica se não é a foto antiga migrada
                                fotosParaRemoverEdit.push({ id: parseInt(fotoId, 10), public_id: publicId });
                                console.log("Marcado para remover:", fotosParaRemoverEdit);
                            } else if (publicId) {
                                // Caso especial: Foto antiga (sem foto.id) mas com public_id
                                fotosParaRemoverEdit.push({ id: null, public_id: publicId });
                                console.log("Marcado para remover (foto antiga):", fotosParaRemoverEdit);
                            } else {
                                console.warn("Não foi possível marcar para remover: ID ou Public ID ausente.", foto);
                            }
                            div.remove();
                        });
                    });
                }
                openPopup(editProductPopup);

            } catch(error) {
                 console.error("Erro ao preparar edição:", error);
                 alert(`Erro ao carregar dados do produto: ${error.message}`);
            }
        }

        // --- Botão Inativar ---
        else if (button.classList.contains('btn-inativar')) {
            if (confirm(`Tem certeza que deseja INATIVAR o produto "${produto.nome}"?`)) {
                try {
                    button.disabled = true; button.textContent = '...'; // Feedback
                    const response = await fetchWithAuth(`/api/produtos/${produtoId}`, { method: 'DELETE' }); // DELETE = Inativar
                    if (!response.ok) throw new Error((await response.json()).message || 'Erro ao inativar.');
                    await carregarTodosProdutos(); // Recarrega e re-renderiza
                } catch (error) {
                    console.error("Erro ao inativar:", error);
                    alert(`Erro: ${error.message}`);
                    button.disabled = false; button.textContent = 'Inativar'; // Restaura botão
                }
            }
        }

        // --- Botão Ativar ---
        else if (button.classList.contains('btn-ativar')) {
             if (confirm(`Tem certeza que deseja ATIVAR o produto "${produto.nome}"?`)) {
                 try {
                     button.disabled = true; button.textContent = '...';
                     const response = await fetchWithAuth(`/api/produtos/${produtoId}/reativar`, { method: 'PUT' });
                     if (!response.ok) throw new Error((await response.json()).message || 'Erro ao ativar.');
                     await carregarTodosProdutos();
                 } catch (error) {
                     console.error("Erro ao ativar:", error);
                     alert(`Erro: ${error.message}`);
                     button.disabled = false; button.textContent = 'Ativar';
                 }
            }
        }

        // --- Botão Excluir Permanentemente ---
         else if (button.classList.contains('btn-excluir-perm')) {
            if (confirm(`ATENÇÃO! Excluir PERMANENTEMENTE o produto "${produto.nome}"? Esta ação NÃO pode ser desfeita e só funciona se não houver vendas associadas.`)) {
                try {
                    button.disabled = true; button.textContent = '...';
                    // Precisamos de um endpoint específico para exclusão permanente,
                    // assumindo que ele existe em POST /api/produtos/excluir-em-massa (mesmo para um só ID)
                    const response = await fetchWithAuth(`/api/produtos/excluir-em-massa`, {
                         method: 'POST',
                         body: JSON.stringify({ ids: [produtoId] }) // Envia como array
                    });
                     const data = await response.json(); // Lê a resposta JSON
                    if (!response.ok) throw new Error(data.message || 'Erro ao excluir.');
                    alert(data.message || "Excluído com sucesso"); // Mostra msg do backend
                    await carregarTodosProdutos();
                } catch (error) {
                    console.error("Erro ao excluir permanentemente:", error);
                    alert(`Erro: ${error.message}`);
                     button.disabled = false; button.textContent = 'Excluir'; // Restaura botão
                }
            }
        }

    });

    // Fechar Modais (Botões X e clique fora)
    document.querySelectorAll('.popup-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) { // Clicou no fundo
                closePopup(backdrop);
            }
        });
        backdrop.querySelectorAll('.close-popup-btn').forEach(button => {
            button.addEventListener('click', () => closePopup(backdrop));
        });
    });

    // --- Inicialização ---
    handleTabClick('ativos'); // Define a aba inicial como ativa visualmente
    carregarTodosProdutos(); // Carrega os dados e renderiza a aba ativa

}); // Fim do DOMContentLoaded
