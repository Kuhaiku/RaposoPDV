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

    // --- Formatadores ---
    const formatCurrency = (val) => parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 1. Carregar Empresa
    async function carregarDadosEmpresa() {
        try {
            const res = await fetchWithAuth('/api/empresas/meus-dados');
            if(res.ok) dadosEmpresa = await res.json();
        } catch (e) { console.warn("Erro empresa"); }
    }

    // 2. Carregar Produtos
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

    // 3. Renderizar na Tela (Visual de Cards)
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

            // Foto Principal
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
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    // Filtros
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

    // 4. Função auxiliar para converter imagem em Base64 (para o PDF)
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
                resolve(canvas.toDataURL('image/jpeg', 0.5)); // Compressão 0.5 para ficar leve
            };
            img.onerror = () => resolve(null); // Retorna null se falhar, para não travar
        });
    }

    // 5. Gerar PDF Otimizado (Tabela)
    btnGerarPDF.addEventListener('click', async () => {
        const btnOriginal = btnGerarPDF.innerHTML;
        btnGerarPDF.disabled = true;
        btnGerarPDF.innerHTML = `<div class="spinner"></div>`;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF(); // A4

            // Prepara os dados para a tabela
            const produtosFiltrados = todosProdutos.filter(p => {
                if (filtroAtual === 'disponivel') return p.estoque > 0;
                if (filtroAtual === 'esgotado') return p.estoque <= 0;
                return true;
            });

            // Cabeçalho
            doc.setFontSize(16);
            doc.text(dadosEmpresa?.nome_empresa || 'RELATÓRIO DE ESTOQUE', 14, 15);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 20);

            // Processa imagens (assíncrono)
            // Para não travar, vamos carregar as imagens de quem tem foto
            // Limite de segurança: só carrega imagem para os primeiros 100 itens para não estourar memória se houver milhares
            // Ou carrega sob demanda. Aqui vou tentar carregar de todos filtrados.
            
            const bodyData = [];
            
            for (const prod of produtosFiltrados) {
                const esgotado = prod.estoque <= 0;
                const fotoUrl = (prod.fotos && prod.fotos.length > 0) ? prod.fotos[0] : null;
                
                // Dados "Crus" para a tabela
                bodyData.push({
                    foto: fotoUrl, // URL da foto para processar no hook
                    nome: prod.nome,
                    codigo: prod.codigo || '-',
                    preco: formatCurrency(prod.preco),
                    estoque: esgotado ? 'ESGOTADO' : prod.estoque,
                    esgotado: esgotado // Flag para riscar
                });
            }

            // Gera a Tabela
            doc.autoTable({
                startY: 25,
                head: [['Img', 'Produto', 'Cód.', 'Preço', 'Estoque']],
                body: bodyData,
                theme: 'grid',
                styles: { fontSize: 9, valign: 'middle', cellPadding: 1 },
                headStyles: { fillColor: [52, 152, 219] },
                columnStyles: {
                    0: { cellWidth: 12 }, // Coluna Imagem estreita
                    1: { cellWidth: 'auto' }, // Nome
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25, halign: 'right' },
                    4: { cellWidth: 25, halign: 'center' }
                },
                
                // Hook para desenhar a imagem na célula
                didDrawCell: async (data) => {
                    if (data.column.index === 0 && data.cell.section === 'body') {
                        // Tenta desenhar a imagem se houver URL
                        if (data.row.raw.foto) {
                             // Nota: autoTable não suporta await dentro do didDrawCell nativamente de forma simples para carregar imagem na hora.
                             // O ideal é ter as imagens em base64 ANTES.
                             // Porém, o jsPDF pode adicionar imagem por URL se for síncrono ou já estiver em cache.
                             // Como simplificação para ficar leve, vamos deixar um quadrado cinza se não carregar,
                             // ou tentar usar addImage se a imagem já estiver em cache do navegador.
                             try {
                                 // Desenha um placeholder ou a imagem se possível
                                 // Para garantir, precisariamos pré-carregar as imagens em base64 no loop anterior.
                                 // Visto que o usuário quer leveza, vamos pular a imagem pesada no PDF ou usar um marcador simples?
                                 // O usuário pediu "garantindo a existencia de uma fotinha".
                                 // Vamos desenhar um pequeno quadrado indicativo.
                             } catch(e) {}
                        }
                    }
                    
                    // Hook para RISCAR (Tachar) se esgotado
                    if (data.column.index === 1 && data.row.raw.esgotado && data.cell.section === 'body') {
                        const startX = data.cell.x + 2;
                        const startY = data.cell.y + (data.cell.height / 2);
                        // Estima largura do texto
                        const txtWidth = doc.getTextWidth(data.cell.text[0]);
                        doc.setLineWidth(0.5);
                        doc.setDrawColor(150); // Cinza
                        doc.line(startX, startY, startX + txtWidth, startY);
                    }
                }
            });

            // Como as imagens dentro do autoTable são complexas de carregar assincronamente sem travar,
            // vamos fazer um "Pós-processamento" para desenhar as imagens por cima das células.
            // Isso garante que o texto tabela renderize rápido, e as imagens entrem depois.
            
            // Iterar sobre as linhas da tabela gerada para desenhar as imagens
            // (Requer acesso a doc.lastAutoTable.finalY e posições, o que é complexo).
            
            // ALTERNATIVA MELHOR PARA IMAGENS:
            // Pré-carregar apenas imagens VISÍVEIS ou limitar.
            // Vou implementar um pré-carregamento rápido no loop anterior.
            
            // Resetamos o doc e fazemos do jeito certo com imagens pré-carregadas:
            const docComImagens = new jsPDF();
            docComImagens.setFontSize(16);
            docComImagens.text(dadosEmpresa?.nome_empresa || 'RELATÓRIO DE ESTOQUE', 14, 15);
            docComImagens.setFontSize(10);
            docComImagens.text(`Filtro: ${filtroAtual.toUpperCase()}`, 14, 22);

            const bodyComBase64 = [];
            
            // Carrega imagens em Base64 (Limitado a 50 para não estourar memória do browser se tiver muitos)
            // Se tiver mais de 50, os outros ficam sem foto para manter o PDF leve.
            let countImgs = 0;
            for(const item of bodyData) {
                let imgData = null;
                if(item.foto && countImgs < 50) { 
                    imgData = await getDataUrl(item.foto);
                    countImgs++;
                }
                item.imgBase64 = imgData;
                bodyComBase64.push([
                    '', // Espaço para imagem
                    item.nome,
                    item.codigo,
                    item.preco,
                    item.estoque
                ]);
            }

            docComImagens.autoTable({
                startY: 25,
                head: [['Foto', 'Produto', 'Cód.', 'Preço', 'Estoque']],
                body: bodyComBase64,
                theme: 'striped',
                bodyStyles: { minCellHeight: 12, valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 14 }, 
                    3: { halign: 'right' },
                    4: { halign: 'center' }
                },
                didDrawCell: (data) => {
                    // Desenha Imagem
                    if (data.column.index === 0 && data.cell.section === 'body') {
                        const originalIndex = data.row.index;
                        const imgData = bodyData[originalIndex].imgBase64;
                        if (imgData) {
                            docComImagens.addImage(imgData, 'JPEG', data.cell.x + 1, data.cell.y + 1, 10, 10);
                        }
                    }
                    
                    // Desenha Risco (Tachado)
                    if (data.column.index === 1 && data.cell.section === 'body') {
                        const originalIndex = data.row.index;
                        if (bodyData[originalIndex].esgotado) {
                            const width = docComImagens.getTextWidth(data.cell.text[0]);
                            const x = data.cell.x + data.cell.padding('left');
                            const y = data.cell.y + (data.cell.height / 2);
                            docComImagens.setDrawColor(100);
                            docComImagens.line(x, y, x + width, y);
                        }
                    }
                }
            });

            docComImagens.save(`Estoque_${filtroAtual}.pdf`);

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
