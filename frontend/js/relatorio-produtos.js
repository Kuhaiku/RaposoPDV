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

    // 3. Renderizar na Tela (Visual de Lista/Grid HTML)
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
            card.className = `bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700 p-4 flex flex-col justify-between h-full ${classeEsgotado}`;
            
            card.innerHTML = `
                <div>
                    <div class="relative w-full h-40 mb-3 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-700 bg-white">
                        <img src="${fotoPrincipal}" class="w-full h-full object-contain">
                    </div>
                    <h3 class="font-bold text-base text-secondary dark:text-white leading-tight prod-nome line-clamp-2">${prod.nome}</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Cód: ${prod.codigo || '-'}</p>
                </div>
                <div class="mt-3 flex justify-between items-end pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <p class="text-xs ${corEstoque}">${textoEstoque}</p>
                    <p class="font-bold text-primary text-lg">${formatCurrency(prod.preco)}</p>
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
                // Redimensiona para economizar tamanho no PDF (Thumbnail)
                const scale = Math.min(300 / img.width, 300 / img.height); // Max 300px
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compressão JPG 0.7
            };
            img.onerror = () => resolve(null); 
        });
    }

    // 5. Gerar PDF em GRID (3 por linha)
    btnGerarPDF.addEventListener('click', async () => {
        const btnOriginal = btnGerarPDF.innerHTML;
        btnGerarPDF.disabled = true;
        btnGerarPDF.innerHTML = `<div class="spinner"></div>`;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ format: 'a4', unit: 'mm' });
            
            // Filtra produtos
            const produtosParaRelatorio = todosProdutos.filter(p => {
                if (filtroAtual === 'disponivel') return p.estoque > 0;
                if (filtroAtual === 'esgotado') return p.estoque <= 0;
                return true;
            });

            // --- Configurações do Grid ---
            const margin = 10;
            const gap = 5; // Espaço entre cards
            const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
            const contentWidth = pageWidth - (margin * 2);
            const cardWidth = (contentWidth - (gap * 2)) / 3; // 3 colunas
            const cardHeight = 65; // Altura fixa do card

            // --- Cabeçalho do PDF ---
            let y = 15;
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(dadosEmpresa?.nome_empresa || 'RELATÓRIO DE ESTOQUE', 105, y, { align: 'center' });
            
            y += 7;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} - Filtro: ${filtroAtual.toUpperCase()}`, 105, y, { align: 'center' });
            
            y += 5;
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            let x = margin; // Posição inicial X

            // --- Loop de Produtos ---
            for (let i = 0; i < produtosParaRelatorio.length; i++) {
                const prod = produtosParaRelatorio[i];
                const esgotado = prod.estoque <= 0;

                // Verifica quebra de página
                // Se a altura do card vai estourar a página
                if (y + cardHeight > 285) {
                    doc.addPage();
                    y = 15; // Reset Y
                    x = margin; // Reset X
                }

                // Desenha o Fundo do Card
                doc.setDrawColor(220);
                doc.setLineWidth(0.1);
                // Cor de fundo: Branco normal, Cinza claro se esgotado
                doc.setFillColor(esgotado ? 245 : 255, esgotado ? 245 : 255, esgotado ? 245 : 255);
                doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

                // Processa Imagem (apenas a primeira)
                const fotoUrl = (prod.fotos && prod.fotos.length > 0) ? prod.fotos[0] : null;
                if (fotoUrl) {
                    try {
                        const imgData = await getDataUrl(fotoUrl);
                        if (imgData) {
                            // Centraliza a imagem no topo do card
                            // Área da imagem: largura cardWidth - padding, altura ~35mm
                            const imgW = cardWidth - 10;
                            const imgH = 30;
                            // drawImage(data, fmt, x, y, w, h)
                            doc.addImage(imgData, 'JPEG', x + 5, y + 5, imgW, imgH, undefined, 'FAST');
                        }
                    } catch (e) {}
                } else {
                    // Placeholder se não tiver foto
                    doc.setFillColor(240);
                    doc.rect(x + 5, y + 5, cardWidth - 10, 30, 'F');
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text("Sem foto", x + (cardWidth / 2), y + 20, { align: 'center' });
                }

                // --- Textos do Card ---
                const textYStart = y + 42;
                
                // Nome (com quebra de linha se for longo)
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(esgotado ? 150 : 0);
                
                // splitTextToSize quebra o texto para caber na largura
                const splitNome = doc.splitTextToSize(prod.nome, cardWidth - 6);
                doc.text(splitNome, x + 3, textYStart);

                // Risco (Tachado) se esgotado
                if (esgotado) {
                    const txtWidth = doc.getTextWidth(splitNome[0]); // Risca a primeira linha
                    doc.setDrawColor(150);
                    doc.setLineWidth(0.4);
                    doc.line(x + 3, textYStart - 1, x + 3 + txtWidth, textYStart - 1);
                }

                // Código
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(150);
                // Posiciona abaixo do nome (considerando que o nome pode ter ocupado linhas)
                const codeY = textYStart + (splitNome.length * 4) + 2;
                doc.text(`Cód: ${prod.codigo || '-'}`, x + 3, codeY);

                // Rodapé do Card (Preço e Estoque)
                const footerY = y + cardHeight - 5;
                
                // Preço (Esquerda)
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(esgotado ? 150 : 52, esgotado ? 150 : 152, esgotado ? 150 : 219); // Azul primary ou cinza
                doc.text(formatCurrency(prod.preco), x + 3, footerY);

                // Estoque (Direita)
                doc.setFontSize(9);
                doc.setTextColor(esgotado ? 200 : 80); // Vermelho ou Cinza Escuro
                const textEstoque = esgotado ? 'ESGOTADO' : `${prod.estoque} un`;
                if(esgotado) doc.setTextColor(231, 76, 60); // Vermelho para texto ESGOTADO
                
                doc.text(textEstoque, x + cardWidth - 3, footerY, { align: 'right' });

                // --- Controle do Grid ---
                // Avança X para a próxima coluna
                x += cardWidth + gap;

                // Se completou 3 colunas, reseta X e avança Y (nova linha)
                if ((i + 1) % 3 === 0) {
                    x = margin;
                    y += cardHeight + gap;
                }
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
