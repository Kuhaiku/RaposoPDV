checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const logoutBtn = document.getElementById('logout-btn');
    const faturamentoMesEl = document.getElementById('faturamento-mes');
    const novosClientesEl = document.getElementById('novos-clientes');
    const btnViewAmbos = document.getElementById('btn-view-ambos');
    const btnViewQuantidade = document.getElementById('btn-view-quantidade');
    const btnViewValor = document.getElementById('btn-view-valor');

    // Variáveis de Estado
    let vendasPorDiaData = [];
    let faturamentoPorDiaData = [];
    let graficoVendas = null;

    // Função para carregar as métricas
    async function carregarMetricas() {
        try {
            const response = await fetchWithAuth('/api/dashboard/metricas');
            if (!response.ok) throw new Error('Erro ao buscar métricas.');
            const data = await response.json();
            
            const faturamentoNumerico = parseFloat(data.faturamentoMes);
            faturamentoMesEl.textContent = `R$ ${faturamentoNumerico.toFixed(2).replace('.', ',')}`;
            novosClientesEl.textContent = data.novosClientes;
            
            vendasPorDiaData = data.vendasPorDia;
            faturamentoPorDiaData = data.faturamentoPorDia;

            // Renderiza o gráfico com a visão padrão "Ambos"
            renderizarGrafico('ambos');
        } catch (error) {
            console.error(error);
            faturamentoMesEl.textContent = 'Erro';
            novosClientesEl.textContent = 'Erro';
        }
    }

    // Função para renderizar o gráfico
    function renderizarGrafico(tipo) {
        Chart.register(ChartDataLabels);
        const ctx = document.getElementById('grafico-vendas-diarias').getContext('2d');

        // Garante que temos todos os dias do mês com dados
        const todosOsDias = [...new Set([...vendasPorDiaData.map(d => d.dia), ...faturamentoPorDiaData.map(d => d.dia)])].sort((a, b) => a - b);
        const labels = todosOsDias.map(dia => `Dia ${dia}`);

        const dataQuantidade = todosOsDias.map(dia => vendasPorDiaData.find(d => d.dia === dia)?.quantidade || 0);
        const dataValor = todosOsDias.map(dia => faturamentoPorDiaData.find(d => d.dia === dia)?.total || 0);
        
        // Calcula o valor máximo de cada dado para dar uma folga no eixo
        const maxQuantidade = Math.max(...dataQuantidade);
        const maxValor = Math.max(...dataValor);

        // Define os datasets (conjuntos de dados) para o gráfico
        const datasets = [];
        if (tipo === 'quantidade' || tipo === 'ambos') {
            datasets.push({
                type: 'bar',
                label: 'Quantidade de Vendas',
                data: dataQuantidade,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderRadius: 5,
                yAxisID: 'y', // Eixo Y da esquerda
                order: 2 
            });
        }
        if (tipo === 'valor' || tipo === 'ambos') {
            datasets.push({
                type: 'line',
                label: 'Valor Total (R$)',
                data: dataValor,
                backgroundColor: 'rgba(46, 204, 113, 1)',
                borderColor: 'rgba(46, 204, 113, 1)',
                tension: 0.1,
                fill: false,
                yAxisID: 'y1', // Eixo Y da direita
                order: 1
            });
        }
        
        if (graficoVendas) {
            graficoVendas.destroy();
        }

        graficoVendas = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Importante para preencher a div de altura fixa
                scales: {
                    y: { // Eixo Y da Esquerda (Quantidade)
                        display: (tipo === 'quantidade' || tipo === 'ambos'),
                        position: 'left',
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        suggestedMax: maxQuantidade * 1.2 // Adiciona 20% de espaço no topo
                    },
                    y1: { // Eixo Y da Direita (Valor R$)
                        display: (tipo === 'valor' || tipo === 'ambos'),
                        position: 'right',
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000) return 'R$' + value / 1000 + 'k';
                                return 'R$' + value;
                            }
                        },
                        suggestedMax: maxValor * 1.2 // Adiciona 20% de espaço no topo
                    }
                },
                plugins: {
                    legend: { display: tipo === 'ambos' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const isValor = context.dataset.type === 'line';
                                const val = context.parsed.y;
                                if (isValor) return `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}`;
                                return `Vendas: ${val}`;
                            }
                        }
                    },
                    datalabels: {
                        display: tipo !== 'ambos',
                        anchor: 'end',
                        align: 'end',
                        color: '#555',
                        font: { weight: 'bold' },
                        formatter: function(value, context) {
                            const isValor = context.dataset.type === 'line';
                            if (isValor && value >= 1000) return 'R$' + (value / 1000).toFixed(1).replace('.',',') + 'k';
                            if (isValor) return 'R$' + value;
                            return value;
                        }
                    }
                }
            }
        });
    }

    // Event Listeners para os botões
    btnViewAmbos.addEventListener('click', () => {
        document.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));
        btnViewAmbos.classList.add('active');
        renderizarGrafico('ambos');
    });
    btnViewQuantidade.addEventListener('click', () => {
        document.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));
        btnViewQuantidade.classList.add('active');
        renderizarGrafico('quantidade');
    });
    btnViewValor.addEventListener('click', () => {
        document.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));
        btnViewValor.classList.add('active');
        renderizarGrafico('valor');
    });
    logoutBtn.addEventListener('click', logout);

    // Inicializa a página
    carregarMetricas();
});