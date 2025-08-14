checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const logoutBtn = document.getElementById('logout-btn');
    const nomeVendedorHeader = document.getElementById('nome-vendedor-header');
    const filtroPeriodoContainer = document.querySelector('.filtro-periodo');
    
    // Cards de métricas
    const totalFaturadoEl = document.getElementById('total-faturado');
    const numeroVendasEl = document.getElementById('numero-vendas');
    const ticketMedioEl = document.getElementById('ticket-medio');
    const itensVendidosEl = document.getElementById('itens-vendidos');

    // Listas e Gráfico
    const topProdutosLista = document.getElementById('top-produtos-lista');
    const ultimasVendasBody = document.getElementById('ultimas-vendas-body');
    const graficoCanvas = document.getElementById('grafico-desempenho-diario');
    let graficoVendas = null;

    // Formulário de Alterar Senha
    const alterarSenhaForm = document.getElementById('alterar-senha-form');
    const successMessageDiv = document.getElementById('success-message');

    // --- ESTADO ---
    let periodoAtual = 'mes';

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function preencherMetricas(dados) {
        totalFaturadoEl.textContent = formatarMoeda(dados.totalFaturado);
        numeroVendasEl.textContent = dados.numeroVendas;
        ticketMedioEl.textContent = formatarMoeda(dados.ticketMedio);
        itensVendidosEl.textContent = dados.itensVendidos;
    }

    function preencherTopProdutos(produtos) {
        topProdutosLista.innerHTML = '';
        if (produtos.length === 0) {
            topProdutosLista.innerHTML = '<li>Nenhuma venda no período.</li>';
            return;
        }
        produtos.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.nome}</span><span class="quantidade">${p.totalVendido} un</span>`;
            topProdutosLista.appendChild(li);
        });
    }

    function preencherUltimasVendas(vendas) {
        ultimasVendasBody.innerHTML = '';
        if (vendas.length === 0) {
            ultimasVendasBody.innerHTML = '<tr><td colspan="3">Nenhuma venda registrada.</td></tr>';
            return;
        }
        vendas.forEach(v => {
            const tr = document.createElement('tr');
            const data = new Date(v.data_venda).toLocaleDateString('pt-BR');
            tr.innerHTML = `<td>${data}</td><td>${v.cliente_nome || 'N/A'}</td><td>${formatarMoeda(v.valor_total)}</td>`;
            ultimasVendasBody.appendChild(tr);
        });
    }

    function renderizarGrafico(graficoData) {
        if (graficoVendas) {
            graficoVendas.destroy();
        }
        const ctx = graficoCanvas.getContext('2d');
        const labels = graficoData.map(d => `Dia ${d.dia}`);
        const data = graficoData.map(d => d.total);

        graficoVendas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Faturamento Diário (R$)',
                    data,
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderRadius: 5,
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- FUNÇÕES DE DADOS ---
    async function carregarDadosPerfil() {
        try {
            const response = await fetchWithAuth(`/api/usuarios/meu-perfil?periodo=${periodoAtual}`);
            if (!response.ok) throw new Error('Erro ao buscar dados do perfil.');
            const dados = await response.json();

            preencherMetricas(dados);
            preencherTopProdutos(dados.topProdutos);
            preencherUltimasVendas(dados.ultimasVendas);
            renderizarGrafico(dados.graficoData);

        } catch (error) {
            console.error(error);
            alert('Não foi possível carregar os dados do seu perfil.');
        }
    }

    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', logout);

    filtroPeriodoContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            document.querySelectorAll('.btn-periodo').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            periodoAtual = event.target.dataset.periodo;
            carregarDadosPerfil();
        }
    });

    alterarSenhaForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        successMessageDiv.textContent = '';
        
        const senhaAtual = document.getElementById('senha-atual').value;
        const novaSenha = document.getElementById('nova-senha').value;

        try {
            const response = await fetchWithAuth('/api/usuarios/redefinir-senha-propria', {
                method: 'PUT',
                body: JSON.stringify({ senhaAtual, novaSenha })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message);

            alterarSenhaForm.reset();
            successMessageDiv.textContent = data.message + " Você será deslogado por segurança.";
            
            setTimeout(() => { logout(); }, 3000);

        } catch (error) {
            alert(error.message);
        }
    });

    // --- INICIALIZAÇÃO ---
    function inicializar() {
        // Pega o nome do vendedor do token para exibir no header
        try {
            const token = localStorage.getItem('authToken');
            const payload = JSON.parse(atob(token.split('.')[1]));
            nomeVendedorHeader.textContent = `Bem-vindo(a), ${payload.nome}!`;
        } catch (e) {
            nomeVendedorHeader.textContent = 'Meu Perfil';
        }
        carregarDadosPerfil();
    }

    inicializar();
});
