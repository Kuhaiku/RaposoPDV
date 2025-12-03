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

    // 3. Renderizar na Tela (HTML)
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

            // Galeria de Imagens HTML
            let fotosHtml = '';
            if (prod.fotos && prod.fotos.length > 0) {
                fotosHtml = `<div class="grid grid-cols-4 gap-2 mt-3">`; // Grid de fotos
                prod.fotos.forEach(url => {
                    fotosHtml += `<div class="aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <img src="${url}" class="w-full h-full object-cover">
                                  </div>`;
                });
                fotosHtml += `</div>`;
            } else {
                fotosHtml = `<div class="mt-3 text-xs text-gray-400 italic">Sem fotos</div>`;
            }

            const card = document.createElement('div');
            card.className = `bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700 p-4 flex flex-col justify-between ${classeEsgotado}`;
            
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="font-bold text-lg text-secondary dark:text-white leading-tight prod-nome">${prod.nome}</h3>
                        <p class="font-bold text-primary text-lg whitespace-nowrap ml-2">${formatCurrency(prod.preco)}</p>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Cód: ${prod.codigo || '-'}</p>
                    
                    ${fotosHtml}
                </div>
                <div class="mt-3 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 text-right">
                    <p class="text-xs ${corEstoque}">${textoEstoque}</p>
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

    // --- Auxiliar: Download de Imagem ---
    function getDataUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Reduz um pouco a resolução para o PDF não ficar gigante se tiver muitas fotos
                const maxDim = 400; 
                let w = img.width; let h = img.height;
                if(w > h && w > maxDim) { h *= maxDim/w; w = maxDim; }
                else if(h > maxDim) { w *= maxDim/h; h = maxDim; }
                
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(null);
        });
    }

    // --- GERAR PDF COM GALERIA E GRADE ---
    btnGerarPDF.addEventListener('click', async () => {
        const btnOriginal = btnGerarPDF.innerHTML;
        btnGerarPDF.disabled = true;
        btnGerarPDF.innerHTML = `<div class="spinner"></div>`;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ format: 'a4', unit: 'mm' });
            
            const produtosParaRelatorio = todosProdutos.filter(p => {
                if (filtroAtual === 'disponivel') return p.estoque > 0;
                if (filtroAtual === 'esgotado') return p.estoque <= 0;
                return true;
            });

            // Configurações do Grid
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            const gap = 5;
            const cols = 3;
            const colWidth = (pageWidth - (margin * 2) - (gap * (cols - 1))) / cols;
            
            // Cabeçalho
            let y = 15;
            doc.setFillColor(44, 62, 80);
            doc.rect(0, 0, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(dadosEmpresa?.nome_empresa || 'CATÁLOGO DE ESTOQUE', 105, 12, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} - Filtro: ${filtroAtual.toUpperCase()}`, 105, 19, { align: 'center' });
            
            y = 35;

            // Loop por LINHAS (processa de 3 em 3 produtos)
            for (let i = 0; i < produtosParaRelatorio.length; i += cols) {
                // Pega os 3 produtos da linha atual
                const rowProducts = produtosParaRelatorio.slice(i, i + cols);
                
                // 1. Pré-processar imagens e calcular altura necessária para a linha
                // Cada linha pode ter altura diferente dependendo da quantidade de fotos
                let maxRowHeight = 0;
                const rowData = [];

                for (const prod of rowProducts) {
                    const fotosBase64 = [];
                    if (prod.fotos && prod.fotos.length > 0) {
                        for (const url of prod.fotos) {
                            const data = await getDataUrl(url);
                            if(data) fotosBase64.push(data);
                        }
                    }

                    // Calcula altura das fotos (Grid 2 colunas dentro do card)
                    // Altura base (Texto) = ~35mm
                    // Altura fotos = (Math.ceil(numFotos / 2)) * alturaFoto
                    const imgThumbSize = (colWidth - 6) / 2; // 2 fotos por linha dentro do card
                    const rowsFotos = Math.ceil(fotosBase64.length / 2);
                    const fotosHeight = rowsFotos * (imgThumbSize + 2); // +2 gap
                    
                    const totalCardHeight = 35 + (fotosHeight > 0 ? fotosHeight + 5 : 10);
                    
                    if (totalCardHeight > maxRowHeight) maxRowHeight = totalCardHeight;

                    rowData.push({
                        ...prod,
                        fotosBase64,
                        cardHeight: totalCardHeight // Altura individual (não usada para layout, mas util saber)
                    });
                }

                // 2. Verifica Quebra de Página
                if (y + maxRowHeight > pageHeight - 10) {
                    doc.addPage();
                    y = 15;
                }

                // 3. Desenhar a linha
                for (let j = 0; j < rowData.length; j++) {
                    const item = rowData[j];
                    const x = margin + (j * (colWidth + gap));
                    const esgotado = item.estoque <= 0;

                    // Fundo do Card
                    doc.setDrawColor(220);
                    doc.setLineWidth(0.1);
                    doc.setFillColor(esgotado ? 245 : 255, esgotado ? 245 : 255, esgotado ? 245 : 255);
                    doc.roundedRect(x, y, colWidth, maxRowHeight, 2, 2, 'FD');

                    // Título e Preço
                    doc.setTextColor(esgotado ? 150 : 0);
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    
                    // Quebra nome longo
                    const nomeLines = doc.splitTextToSize(item.nome, colWidth - 6);
                    doc.text(nomeLines, x + 3, y + 6);
                    
                    // Risco se esgotado (na primeira linha do nome)
                    if (esgotado) {
                        const txtW = doc.getTextWidth(nomeLines[0]);
                        doc.setDrawColor(150);
                        doc.setLineWidth(0.4);
                        doc.line(x + 3, y + 4.5, x + 3 + txtW, y + 4.5);
                    }

                    // Info Código
                    const nextY = y + 6 + (nomeLines.length * 4);
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(150);
                    doc.text(`Cód: ${item.codigo || '-'}`, x + 3, nextY);

                    // Imagens (Galeria)
                    let imgY = nextY + 4;
                    const thumbSize = (colWidth - 8) / 2; // 2 colunas de imagem com margem
                    
                    if (item.fotosBase64.length > 0) {
                        item.fotosBase64.forEach((img, idx) => {
                            const imgCol = idx % 2;
                            const imgRow = Math.floor(idx / 2);
                            const imgX = x + 3 + (imgCol * (thumbSize + 2));
                            const currentImgY = imgY + (imgRow * (thumbSize + 2));
                            
                            doc.addImage(img, 'JPEG', imgX, currentImgY, thumbSize, thumbSize, undefined, 'FAST');
                        });
                    } else {
                        doc.text("(Sem fotos)", x + 3, imgY + 5);
                    }

                    // Rodapé (Preço e Estoque) - Fixo no fundo do card
                    const footerY = y + maxRowHeight - 5;
                    
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(esgotado ? 150 : 52, esgotado ? 150 : 152, esgotado ? 150 : 219); // Azul
                    doc.text(formatCurrency(item.preco), x + 3, footerY);

                    doc.setFontSize(9);
                    const textEstoque = esgotado ? 'ESGOTADO' : `${item.estoque} un`;
                    doc.setTextColor(esgotado ? 200 : 80);
                    if(esgotado) doc.setTextColor(231, 76, 60); // Vermelho
                    doc.text(textEstoque, x + colWidth - 3, footerY, { align: 'right' });
                }

                // Avança Y para a próxima linha
                y += maxRowHeight + gap;
            }

            doc.save(`Catalogo_Estoque_${filtroAtual}.pdf`);

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
