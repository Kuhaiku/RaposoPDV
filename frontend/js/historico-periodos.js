checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const periodosTableBody = document.getElementById('periodos-table-body');

    function formatarData(dataISO) {
        if (!dataISO) return '';
        // Converte o formato ISO (incluindo o timestamp) para um formato legível
        return new Date(dataISO).toLocaleString('pt-BR');
    }

    function formatarMoeda(valor) {
        return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    async function carregarHistoricoPeriodos() {
        try {
            const response = await fetchWithAuth('/api/usuarios/historico-periodos');
            if (!response.ok) throw new Error('Erro ao buscar histórico de períodos.');

            const periodos = await response.json();
            periodosTableBody.innerHTML = '';

            if (periodos.length === 0) {
                periodosTableBody.innerHTML = '<tr><td colspan="5">Nenhum período de vendas foi encerrado ainda.</td></tr>';
                return;
            }

            periodos.forEach(periodo => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatarData(periodo.data_inicio)}</td>
                    <td>${formatarData(periodo.data_fim)}</td>
                    <td>${formatarMoeda(periodo.total_faturado)}</td>
                    <td>${periodo.numero_vendas}</td>
                    <td>${formatarMoeda(periodo.comissao_vendedor)}</td>
                `;
                periodosTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error(error.message);
            periodosTableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar histórico: ${error.message}</td></tr>`;
            alert('Não foi possível carregar o histórico de períodos.');
        }
    }

    logoutBtn.addEventListener('click', logout);
    carregarHistoricoPeriodos();
});