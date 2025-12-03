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

    // 3. Renderizar (Visual de Cards)
    function renderizarLista() {
        listContainer.innerHTML = '';
        
        const produtosFiltrados = todosProdutos.filter(p => {
            if (filtroAtual === 'disponivel') return p.estoque > 0;
            if (filtroAtual === 'esgotado') return p.estoque <= 0;
            return true;
        });

        if (produtosFiltrados.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500 py-10">Nenhum produto encontrado.</p>';
            return;
        }

        produtosFiltrados.forEach(prod => {
            const esgotado = prod.estoque <= 0;
            const classeEsgotado = esgotado ? 'item-esgotado' : '';
            const textoEstoque = esgotado ? 'ESGOTADO' : `${prod.estoque} un`;
            const corEstoque = esgotado ? 'text-danger font-bold' : 'text-zinc-500 dark:text-zinc-400';

            // Galeria de Imagens (HTML)
            let fotosHtml = '';
            if (prod.fotos && prod.fotos.length > 0) {
                fotosHtml = `<div class="flex gap-2 overflow-x-auto mt-3 pb-2">`;
                prod.fotos.forEach(url => {
                    fotosHtml += `<img src="${url}" class="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700 flex-shrink-0">`;
                });
                fotosHtml += `</div>`;
            } else {
                fotosHtml = `<div class="mt-3 text-xs text-gray-400 italic">Sem fotos</div>`;
            }

            const card = document.createElement('div');
            card.className = `bg-white dark:bg-zinc-800 rounded-xl shadow-sm border dark:border-zinc-700 p-4 mb-4 ${classeEsgotado}`;
            
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-lg text-secondary dark:text-white leading-tight">${prod.nome}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Cód: ${prod.codigo || '-'}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-primary text-lg">${formatCurrency(prod.preco)}</p>
                        <p class="text-xs ${corEstoque}">${textoEstoque}</p>
                    </div>
                </div>
                ${fotosHtml}
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

    // 4. Gerar PDF
    btnGerarPDF.addEventListener('click', async () => {
        const btnOriginal = btnGerarPDF.innerHTML;
        btnGerarPDF.disabled = true;
        btnGerarPDF.innerHTML = `<div class="spinner"></div>`;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ format: 'a4', unit: 'mm' });
            
            // Filtra os produtos conforme a tela atual
            const produtosParaRelatorio = todosProdutos.filter(p => {
                if (filtroAtual === 'disponivel') return p.estoque > 0;
                if (filtroAtual === 'esgotado') return p.estoque <= 0;
                return true;
            });

            // Cabeçalho
            let y = 15;
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(dadosEmpresa?.nome_empresa || 'RELATÓRIO DE ESTOQUE', 105, y, { align: 'center' });
            
            y += 7;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, y, { align: 'center' });
            
            y += 5;
            doc.setLineWidth(0.5);
            doc.line(10, y, 200, y);
            y += 10;

            // Loop Produtos
            for (const prod of produtosParaRelatorio) {
                // Verifica quebra de página (espaço estimado para card + fotos)
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }

                const esgotado = prod.estoque <= 0;
                
                // Desenha Card (Retângulo)
                doc.setDrawColor(200);
                doc.setFillColor(esgotado ? 245 : 255, esgotado ? 245 : 255, esgotado ? 245 : 255); // Cinza se esgotado
                doc.roundedRect(10, y, 190, 45, 2, 2, 'FD'); // Fundo preenchido

                // Info Texto
                doc.setTextColor(esgotado ? 150 : 0);
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(prod.nome, 15, y + 8);
                
                // Risco se esgotado (Strikethrough simulado)
                if (esgotado) {
                    const textWidth = doc.getTextWidth(prod.nome);
                    doc.setLineWidth(0.5);
                    doc.line(15, y + 6, 15 + textWidth, y + 6);
                }

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Cód: ${prod.codigo || '-'}`, 15, y + 14);

                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(esgotado ? 150 : 52, esgotado ? 150 : 152, esgotado ? 150 : 219); // Azul ou Cinza
                doc.text(formatCurrency(prod.preco), 195, y + 8, { align: 'right' });

                doc.setFontSize(10);
                doc.setTextColor(esgotado ? 200 : 80);
                doc.text(esgotado ? 'ESGOTADO' : `${prod.estoque} un`, 195, y + 14, { align: 'right' });

                // Imagens
                if (prod.fotos && prod.fotos.length > 0) {
                    let xImg = 15;
                    // Limita a 5 fotos no PDF para não estourar largura
                    const fotosParaMostrar = prod.fotos.slice(0, 6); 
                    
                    for (const url of fotosParaMostrar) {
                        try {
                            // Carrega imagem (base64 ou url direta se CORS permitir)
                            const imgData = await carregarImagemBase64(url);
                            // Desenha imagem
                            doc.addImage(imgData, 'JPEG', xImg, y + 18, 20, 20); // Tamanho 20x20mm
                            xImg += 22; // Espaço entre fotos
                        } catch (err) {
                            // Se falhar, pula a imagem
                        }
                    }
                } else {
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text("(Sem fotos)", 15, y + 25);
                }

                y += 50; // Avança para o próximo card
            }

            doc.save(`Estoque_${new Date().toISOString().slice(0,10)}.pdf`);

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar PDF: " + error.message);
        } finally {
            btnGerarPDF.disabled = false;
            btnGerarPDF.innerHTML = btnOriginal;
        }
    });

    // Função auxiliar para converter URL em Base64 para o PDF
    function carregarImagemBase64(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = reject;
        });
    }

    carregarDadosEmpresa();
    carregarProdutos();
});
