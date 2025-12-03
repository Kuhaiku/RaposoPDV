// frontend/js/relatorio-produtos.js

if (typeof checkAuth !== 'function') { console.error("Auth não carregado"); } else { checkAuth(); }

document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('produtos-list-container');
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const btnGerarPDF = document.getElementById('btn-gerar-pdf');
    
    let todosProdutos = [];
    let filtroAtual = 'todos';
    let dadosEmpresa = null;

    const formatCurrency = (val) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    async function carregarDadosEmpresa() {
        try {
            const res = await fetchWithAuth('/api/empresas/meus-dados');
            if(res.ok) dadosEmpresa = await res.json();
        } catch (e) { console.warn("Erro empresa"); }
    }

    async function carregarProdutos() {
        try {
            const response = await fetchWithAuth('/api/produtos/relatorio-completo');
            if (!response.ok) throw new Error("Erro ao buscar produtos");
            todosProdutos = await response.json();
            renderizarLista();
        } catch (error) {
            loadingPlaceholder.textContent = `Erro: ${error.message}`;
        }
    }

    function renderizarLista() {
        listContainer.innerHTML = '';
        const produtosFiltrados = todosProdutos.filter(p => {
            if (filtroAtual === 'disponivel') return p.estoque > 0;
            if (filtroAtual === 'esgotado') return p.estoque <= 0;
            return true;
        });

        if (produtosFiltrados.length === 0) {
            listContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Nenhum produto encontrado.</p>';
            return;
        }

        produtosFiltrados.forEach(prod => {
            const esgotado = prod.estoque <= 0;
            const classeEsgotado = esgotado ? 'item-esgotado' : '';
            const textoEstoque = esgotado ? 'ESGOTADO' : `${prod.estoque} un`;
            const corEstoque = esgotado ? 'text-danger font-bold' : 'text-zinc-500 dark:text-zinc-400';
            const fotoPrincipal = (prod.fotos && prod.fotos.length > 0) ? prod.fotos[0] : 'img/placeholder.png';

            const card = document.createElement('div');
            card.className = `bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700 p-4 ${classeEsgotado}`;
            card.innerHTML = `
                <div class="flex gap-4">
                    <img src="${fotoPrincipal}" class="w-20 h-20 object-cover rounded-md border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-base text-secondary dark:text-white leading-tight prod-nome truncate pr-2">${prod.nome}</h3>
                            <p class="font-bold text-primary whitespace-nowrap">${formatCurrency(prod.preco)}</p>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Cód: ${prod.codigo || '-'}</p>
                        <div class="mt-3 flex justify-between items-end">
                            <p class="text-xs ${corEstoque}">${textoEstoque}</p>
                            ${prod.fotos && prod.fotos.length > 1 ? `<span class="text-xs text-blue-500">+${prod.fotos.length - 1} fotos</span>` : ''}
                        </div>
                    </div>
                </div>`;
            listContainer.appendChild(card);
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => {
                b.classList.remove('bg-primary', 'text-white');
                b.classList.add('bg-zinc-200', 'text-zinc-600', 'dark:bg-zinc-800', 'dark:text-zinc-300');
            });
            btn.classList.remove('bg-zinc-200', 'text-zinc-600', 'dark:bg-zinc-800', 'dark:text-zinc-300');
            btn.classList.add('bg-primary', 'text-white');
            filtroAtual = btn.dataset.filter;
            renderizarLista();
        });
    });

    function getDataUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.onerror = () => resolve(null);
        });
    }

    // --- GERAR PDF DO ESTOQUE (CORRIGIDO) ---
    btnGerarPDF.addEventListener('click', async () => {
        const btnOriginal = btnGerarPDF.innerHTML;
        btnGerarPDF.disabled = true;
        btnGerarPDF.innerHTML = `<div class="spinner"></div>`;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const produtosFiltrados = todosProdutos.filter(p => {
                if (filtroAtual === 'disponivel') return p.estoque > 0;
                if (filtroAtual === 'esgotado') return p.estoque <= 0;
                return true;
            });

            // Prepara dados para a tabela
            const bodyData = [];
            for (const prod of produtosFiltrados) {
                const esgotado = prod.estoque <= 0;
                let imgData = null;
                // Carrega imagem se existir (limite para não travar)
                if(prod.fotos && prod.fotos.length > 0 && bodyData.length < 50) {
                    imgData = await getDataUrl(prod.fotos[0]);
                }

                // AQUI ESTÁ A CORREÇÃO: A imagem vai DENTRO do objeto da linha
                bodyData.push({
                    imagem: imgData, // Armazena o base64 aqui
                    nome: prod.nome,
                    codigo: prod.codigo || '-',
                    preco: formatCurrency(prod.preco),
                    estoque: esgotado ? 'ESGOTADO' : prod.estoque,
                    esgotado: esgotado
                });
            }

            doc.setFontSize(16);
            doc.text(dadosEmpresa?.nome_empresa || 'RELATÓRIO DE ESTOQUE', 14, 15);
            doc.setFontSize(10);
            doc.text(`Filtro: ${filtroAtual.toUpperCase()} - Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

            // Converte para formato de array que o autoTable entende, passando o objeto na primeira coluna
            const tableBody = bodyData.map(item => [
                { content: '', image: item.imagem }, // Coluna 0: Objeto especial para imagem
                item.nome,
                item.codigo,
                item.preco,
                item.estoque
            ]);

            doc.autoTable({
                startY: 28,
                head: [['Foto', 'Produto', 'Cód.', 'Preço', 'Estoque']],
                body: tableBody,
                theme: 'striped',
                bodyStyles: { minCellHeight: 15, valign: 'middle', fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 15 }, 
                    3: { halign: 'right' },
                    4: { halign: 'center' }
                },
                didDrawCell: (data) => {
                    // Desenha Imagem
                    if (data.column.index === 0 && data.cell.section === 'body') {
                        // Acessa a imagem diretamente da célula atual (data.cell.raw.image)
                        const img = data.cell.raw.image;
                        if (img) {
                            doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 2, 11, 11);
                        }
                    }
                    
                    // Desenha Risco (Tachado) se esgotado
                    if (data.column.index === 1 && data.cell.section === 'body') {
                        // Precisamos checar se é esgotado usando o índice da linha
                        if (bodyData[data.row.index] && bodyData[data.row.index].esgotado) {
                            const width = doc.getTextWidth(data.cell.text[0]);
                            const x = data.cell.x + data.cell.padding('left');
                            const y = data.cell.y + (data.cell.height / 2);
                            doc.setDrawColor(150);
                            doc.line(x, y, x + width, y);
                        }
                    }
                }
            });

            doc.save(`Estoque_${filtroAtual}.pdf`);

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar PDF: " + error.message);
        } finally {
            btnGerarPDF.disabled = false;
            btnGerarPDF.innerHTML = btnOriginal;
        }
    });

    carregarDadosEmpresa();
    carregarProdutos();
});
