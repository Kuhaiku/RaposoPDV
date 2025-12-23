if (typeof checkAuth !== 'function' || typeof fetchWithAuth !== 'function') {
    console.error("Funções de auth não encontradas.");
} else {
    checkAuth();
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos ---
    const productListContainer = document.getElementById('product-list-container');
    const productListPlaceholder = document.getElementById('product-list-placeholder');
    const searchInput = document.getElementById('search-input');
    const tabAtivos = document.getElementById('tab-ativos');
    const tabInativos = document.getElementById('tab-inativos');
    const addProductButton = document.getElementById('add-product-button');
    
    // Elementos de Ação em Massa
    const massActionsBar = document.getElementById('mass-actions-bar');
    const selectedCountSpan = document.getElementById('selected-count');
    const cancelSelectionBtn = document.getElementById('cancel-selection-btn');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const massInactivateBtn = document.getElementById('mass-inactivate-btn');
    const massReactivateBtn = document.getElementById('mass-reactivate-btn');
    const massDeleteBtn = document.getElementById('mass-delete-btn');

    // Elementos de Importação CSV
    const btnImportCsv = document.getElementById('btn-import-csv');
    const importCsvPopup = document.getElementById('import-csv-popup');
    const importCsvForm = document.getElementById('import-csv-form');
    const csvInput = document.getElementById('csv-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const importMessage = document.getElementById('import-message');

    // Modais
    const addProductPopup = document.getElementById('add-product-popup');
    const editProductPopup = document.getElementById('edit-product-popup');
    const addProductForm = document.getElementById('add-product-form');
    const editProductForm = document.getElementById('edit-product-form');

    // Estado
    let todosProdutos = [];
    let filtroAtual = 'ativos';
    let termoBusca = '';
    let selectedIds = new Set();
    
    // Estado de Edição/Upload
    let addProductFiles = [];
    let editProductFiles = [];
    let fotosParaRemoverEdit = [];
    const MAX_IMAGES = 5;

    // --- Helpers ---
    const formatCurrency = (val) => parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const openPopup = (el) => { el.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const closePopup = (el) => { el.classList.remove('is-open'); document.body.style.overflow = ''; };
    const showMsg = (el, msg, err) => { el.textContent = msg; el.classList.remove('hidden', 'text-green-600', 'text-red-600'); el.classList.add(err ? 'text-red-600' : 'text-green-600'); };

    // --- Imagens ---
    const handleFile = (e, container, storage) => {
        const files = Array.from(e.target.files || []);
        if(!files.length) return;
        const current = container.querySelectorAll('.image-preview').length;
        if(files.length + current > MAX_IMAGES) { alert(`Limite de ${MAX_IMAGES} imagens.`); return; }

        files.forEach(file => {
             storage.push(file);
             const reader = new FileReader();
             reader.onload = (ev) => {
                 const div = document.createElement('div');
                 div.className = 'image-preview new-image';
                 div.innerHTML = `<img src="${ev.target.result}"><button type="button" class="remove-image-btn">&times;</button>`;
                 div.querySelector('button').addEventListener('click', (btne) => {
                     btne.stopPropagation(); div.remove();
                     const idx = storage.indexOf(file); if(idx > -1) storage.splice(idx, 1);
                     checkLimit(container);
                 });
                 container.insertBefore(div, container.querySelector('.add-image-btn'));
             };
             reader.readAsDataURL(file);
        });
        checkLimit(container);
    };
    const checkLimit = (c) => { c.querySelector('.add-image-btn').style.display = c.querySelectorAll('.image-preview').length >= MAX_IMAGES ? 'none' : 'flex'; };

    document.getElementById('add-images-input').addEventListener('change', (e) => handleFile(e, document.getElementById('add-image-previews'), addProductFiles));
    document.getElementById('edit-images-input').addEventListener('change', (e) => handleFile(e, document.getElementById('edit-image-previews'), editProductFiles));

    // --- Funções Principais ---

    const carregarTodosProdutos = async () => {
        productListPlaceholder.textContent = 'Carregando...'; productListPlaceholder.classList.remove('hidden');
        productListContainer.innerHTML = '';
        selectedIds.clear(); updateMassActionsUI(); 

        try {
            const [ativosRes, inativosRes] = await Promise.all([
                fetchWithAuth('/api/produtos'),
                fetchWithAuth('/api/produtos/inativos')
            ]);
            const ativos = await ativosRes.json();
            const inativos = await inativosRes.json();

            todosProdutos = [
                ...ativos.map(p => ({ ...p, ativo: true })),
                ...inativos.map(p => ({ ...p, ativo: false }))
            ];
            todosProdutos.sort((a, b) => a.nome.localeCompare(b.nome));
            renderizarProdutos();
        } catch (error) {
            console.error(error);
            productListPlaceholder.textContent = 'Erro ao carregar produtos.';
        }
    };

    const renderizarProdutos = () => {
        productListContainer.innerHTML = '';
        productListPlaceholder.classList.add('hidden');

        // Filtra
        const produtosFiltrados = todosProdutos.filter(p => {
            const statusOk = (filtroAtual === 'ativos' && p.ativo) || (filtroAtual === 'inativos' && !p.ativo);
            const buscaOk = termoBusca === '' || p.nome.toLowerCase().includes(termoBusca) || (p.codigo && String(p.codigo).toLowerCase().includes(termoBusca));
            return statusOk && buscaOk;
        });

        if (produtosFiltrados.length === 0) {
            productListPlaceholder.textContent = 'Nenhum produto encontrado.'; productListPlaceholder.classList.remove('hidden');
            selectAllCheckbox.checked = false;
            return;
        }

        const allVisibleIds = produtosFiltrados.map(p => p.id);
        const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(String(id)));
        selectAllCheckbox.checked = allSelected;

        produtosFiltrados.forEach(produto => {
            const isSelected = selectedIds.has(String(produto.id));
            const card = document.createElement('div');
            // Design do Card Ajustado
            card.className = `flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg p-3 shadow-sm border border-transparent transition-all ${isSelected ? 'ring-2 ring-primary bg-blue-50 dark:bg-zinc-800' : 'hover:border-zinc-200 dark:hover:border-zinc-700'}`;
            card.dataset.produtoId = produto.id;

            const checkboxHtml = `
                <div class="flex-shrink-0" onclick="event.stopPropagation()">
                    <input type="checkbox" class="product-checkbox custom-checkbox form-checkbox text-primary border-zinc-400 rounded focus:ring-primary bg-transparent" value="${produto.id}" ${isSelected ? 'checked' : ''}>
                </div>
            `;

            card.innerHTML = `
                ${checkboxHtml}
                <img class="rounded-lg w-14 h-14 object-cover border dark:border-zinc-700 flex-shrink-0 bg-zinc-100" src="${produto.foto_url || 'img/placeholder.png'}" alt="${produto.nome}"/>
                <div class="flex-1 min-w-0 cursor-pointer card-clickable-area">
                    <p class="text-secondary dark:text-white text-sm font-semibold truncate leading-tight">${produto.nome}</p>
                    <p class="text-zinc-500 text-xs">SKU: ${produto.codigo || 'N/A'}</p>
                    <p class="text-${produto.ativo ? 'primary' : 'zinc-500'} font-bold text-sm mt-0.5">${formatCurrency(produto.preco)}</p>
                </div>
                <div class="flex-shrink-0">
                    <button class="btn-edit p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"><span class="material-symbols-outlined">edit</span></button>
                </div>
            `;
            
            card.querySelector('.product-checkbox').addEventListener('change', (e) => {
                toggleSelection(String(produto.id), e.target.checked);
            });

            card.querySelector('.card-clickable-area').addEventListener('click', () => abrirEdicao(produto));
            card.querySelector('.btn-edit').addEventListener('click', () => abrirEdicao(produto));

            productListContainer.appendChild(card);
        });
    };

    // --- Lógica de Seleção em Massa ---
    const toggleSelection = (id, checked) => {
        if (checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateMassActionsUI();
        renderizarProdutos(); 
    };

    const toggleSelectAll = (checked) => {
        const produtosVisiveis = todosProdutos.filter(p => {
            const statusOk = (filtroAtual === 'ativos' && p.ativo) || (filtroAtual === 'inativos' && !p.ativo);
            const buscaOk = termoBusca === '' || p.nome.toLowerCase().includes(termoBusca);
            return statusOk && buscaOk;
        });

        if (checked) {
            produtosVisiveis.forEach(p => selectedIds.add(String(p.id)));
        } else {
            produtosVisiveis.forEach(p => selectedIds.delete(String(p.id)));
        }
        updateMassActionsUI();
        renderizarProdutos();
    };

    const updateMassActionsUI = () => {
        const count = selectedIds.size;
        selectedCountSpan.textContent = count;
        
        if (count > 0) {
            massActionsBar.classList.add('visible');
            if (filtroAtual === 'ativos') {
                massInactivateBtn.classList.remove('hidden');
                massReactivateBtn.classList.add('hidden');
                massDeleteBtn.classList.add('hidden');
            } else {
                massInactivateBtn.classList.add('hidden');
                massReactivateBtn.classList.remove('hidden');
                massDeleteBtn.classList.remove('hidden');
            }
        } else {
            massActionsBar.classList.remove('visible');
        }
    };

    selectAllCheckbox.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
    cancelSelectionBtn.addEventListener('click', () => { selectedIds.clear(); updateMassActionsUI(); renderizarProdutos(); });

    // --- Switch de Abas (Ativos/Inativos) ---
    const switchTab = (tab) => {
        filtroAtual = tab;
        // Atualiza estilo das abas
        if (tab === 'ativos') {
            tabAtivos.classList.add('bg-white', 'shadow-sm', 'text-primary');
            tabAtivos.classList.remove('hover:bg-zinc-200', 'dark:hover:bg-zinc-700');
            tabInativos.classList.remove('bg-white', 'shadow-sm', 'text-primary');
            tabInativos.classList.add('hover:bg-zinc-200', 'dark:hover:bg-zinc-700');
        } else {
            tabInativos.classList.add('bg-white', 'shadow-sm', 'text-primary');
            tabInativos.classList.remove('hover:bg-zinc-200', 'dark:hover:bg-zinc-700');
            tabAtivos.classList.remove('bg-white', 'shadow-sm', 'text-primary');
            tabAtivos.classList.add('hover:bg-zinc-200', 'dark:hover:bg-zinc-700');
        }
        
        selectedIds.clear(); updateMassActionsUI(); 
        renderizarProdutos();
    };
    tabAtivos.addEventListener('click', () => switchTab('ativos'));
    tabInativos.addEventListener('click', () => switchTab('inativos'));

    // --- Ações em Massa (API) ---
    const executarAcaoEmMassa = async (url, method, confirmMsg, successMsg) => {
        if (!confirm(confirmMsg)) return;
        const ids = Array.from(selectedIds);
        
        try {
            const res = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: ids })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erro na operação.');
            
            alert(data.message || successMsg);
            carregarTodosProdutos();
        } catch (error) {
            console.error(error);
            alert(`Erro: ${error.message}`);
        }
    };

    massInactivateBtn.addEventListener('click', () => executarAcaoEmMassa('/api/produtos/inativar-em-massa', 'PUT', `Inativar ${selectedIds.size} produto(s)?`, 'Produtos inativados.'));
    massReactivateBtn.addEventListener('click', () => executarAcaoEmMassa('/api/produtos/reativar-em-massa', 'PUT', `Reativar ${selectedIds.size} produto(s)?`, 'Produtos reativados.'));
    massDeleteBtn.addEventListener('click', () => executarAcaoEmMassa('/api/produtos/excluir-em-massa', 'POST', `ATENÇÃO: EXCLUIR PERMANENTEMENTE ${selectedIds.size} produto(s)?\nIsso apagará fotos e dados. Não pode ser desfeito.`, 'Produtos excluídos.'));

    // --- Importação CSV ---
    btnImportCsv.addEventListener('click', () => {
        importCsvForm.reset();
        fileNameDisplay.textContent = '';
        fileNameDisplay.classList.add('hidden');
        importMessage.classList.add('hidden');
        openPopup(importCsvPopup);
    });

    csvInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            fileNameDisplay.classList.remove('hidden');
        } else {
            fileNameDisplay.classList.add('hidden');
        }
    });

    importCsvForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = importCsvForm.closest('.popup').querySelector('button[type="submit"]');
        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm mr-2">progress_activity</span> Processando...`;
        
        const formData = new FormData(importCsvForm);

        try {
            const res = await fetchWithAuth('/api/produtos/importar-csv', {
                method: 'POST',
                body: formData 
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erro ao importar CSV.');
            }

            showMsg(importMessage, data.message || 'Importação concluída com sucesso!');
            await carregarTodosProdutos();
            
            setTimeout(() => {
                closePopup(importCsvPopup);
                importMessage.classList.add('hidden');
            }, 2000);

        } catch (error) {
            console.error(error);
            showMsg(importMessage, error.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });

    // --- Search ---
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchInput.timer);
        searchInput.timer = setTimeout(() => { termoBusca = e.target.value.toLowerCase(); renderizarProdutos(); }, 300);
    });

    // --- Formulários (Add/Edit) ---
    const abrirEdicao = async (produto) => {
        editProductForm.reset();
        document.getElementById('edit-image-previews').innerHTML = `<label for="edit-images-input" class="add-image-btn"><span class="material-symbols-outlined text-4xl">add_photo_alternate</span></label>`;
        fotosParaRemoverEdit = []; editProductFiles = []; document.getElementById('edit-images-input').value = null;
        
        try {
            const res = await fetchWithAuth(`/api/produtos/${produto.id}`);
            const p = await res.json();
            document.getElementById('edit-product-id').value = p.id;
            document.getElementById('edit-product-name').value = p.nome;
            document.getElementById('edit-product-codigo').value = p.codigo || '';
            document.getElementById('edit-product-preco').value = p.preco;
            document.getElementById('edit-product-estoque').value = p.estoque;
            document.getElementById('edit-product-categoria').value = p.categoria || '';
            document.getElementById('edit-product-descricao').value = p.descricao || '';
            
            if(p.fotos) {
                p.fotos.forEach(f => {
                    const div = document.createElement('div'); div.className = 'image-preview';
                    div.innerHTML = `<img src="${f.url}"><button type="button" class="remove-image-btn">&times;</button>`;
                    div.querySelector('button').addEventListener('click', () => {
                        fotosParaRemoverEdit.push({ id: f.id, public_id: f.public_id });
                        div.remove(); checkLimit(document.getElementById('edit-image-previews'));
                    });
                    const cont = document.getElementById('edit-image-previews');
                    cont.insertBefore(div, cont.querySelector('.add-image-btn'));
                });
            }
            checkLimit(document.getElementById('edit-image-previews'));
            openPopup(editProductPopup);
        } catch(e) { console.error(e); alert('Erro ao abrir edição.'); }
    };

    addProductButton.addEventListener('click', () => {
        addProductForm.reset(); addProductFiles = []; 
        document.getElementById('add-image-previews').innerHTML = `<label for="add-images-input" class="add-image-btn"><span class="material-symbols-outlined text-4xl">add_photo_alternate</span></label>`;
        openPopup(addProductPopup);
    });

    const handleFormSubmit = async (e, form, url, method, files, msgEl, popup) => {
        e.preventDefault();
        const btn = form.closest('.popup').querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = 'Salvando...';
        
        const fd = new FormData(form);
        if(method === 'PUT') fd.append('fotosParaRemover', JSON.stringify(fotosParaRemoverEdit));
        files.forEach(f => fd.append('imagens', f));

        try {
            const res = await fetchWithAuth(url, { method: method, body: fd });
            if(!res.ok) throw new Error((await res.json()).message);
            showMsg(msgEl, 'Salvo com sucesso!');
            await carregarTodosProdutos();
            setTimeout(() => { closePopup(popup); msgEl.classList.add('hidden'); }, 1000);
        } catch(err) { showMsg(msgEl, err.message, true); }
        finally { btn.disabled = false; btn.innerHTML = 'Salvar'; }
    };

    addProductForm.addEventListener('submit', (e) => handleFormSubmit(e, addProductForm, '/api/produtos', 'POST', addProductFiles, document.getElementById('add-product-message'), addProductPopup));
    editProductForm.addEventListener('submit', (e) => handleFormSubmit(e, editProductForm, `/api/produtos/${document.getElementById('edit-product-id').value}`, 'PUT', editProductFiles, document.getElementById('edit-product-message'), editProductPopup));

    document.querySelectorAll('.popup-backdrop').forEach(b => {
        b.addEventListener('click', (e) => { if(e.target === b) closePopup(b); });
        b.querySelectorAll('.close-popup-btn').forEach(btn => btn.addEventListener('click', () => closePopup(b)));
    });

    carregarTodosProdutos();
});
