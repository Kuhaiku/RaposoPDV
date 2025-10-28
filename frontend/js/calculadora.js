// kuhaiku/raposopdv/RaposoPDV-085802f1cf98b5935bfd28bc7b0705fa97753a17/frontend/js/calculadora.js
if (typeof checkAuth !== 'function' || typeof fetchWithAuth !== 'function') {
    console.error("Funções 'checkAuth' ou 'fetchWithAuth' não encontradas.");
} else {
    checkAuth();
}

document.addEventListener('DOMContentLoaded', () => {
    const totalValueInput = document.getElementById('total-value');
    const percentageInput = document.getElementById('percentage');
    const resultInput = document.getElementById('result');
    // *** Seleção por ID para ambos os botões ***
    const clearButton = document.getElementById('clear-button');
    const loadFromSalesButton = document.getElementById('load-sales-button'); // <<-- SELEÇÃO ATUALIZADA

    // Função para formatar o valor como moeda
    const formatCurrency = (value) => {
        const number = parseFloat(value) || 0;
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Função principal de cálculo
    const calculatePercentage = () => {
        // Remove pontos (milhares) e troca vírgula por ponto (decimal) para o parseFloat
        const rawTotal = totalValueInput.value.replace(/\./g, '').replace(',', '.');
        const rawPercentage = percentageInput.value.replace(/\./g, '').replace(',', '.');

        const total = parseFloat(rawTotal) || 0;
        const percentage = parseFloat(rawPercentage) || 0;

        if (total > 0 && percentage >= 0) {
            const result = (total * percentage) / 100;
            resultInput.value = formatCurrency(result);
        } else {
            resultInput.value = formatCurrency(0);
        }
    };

    // Carrega o valor total de vendas do período atual (usando o mesmo endpoint do painel)
    async function loadTotalSales() {
        // *** Verifica se o botão existe antes de usá-lo ***
        if (!loadFromSalesButton) return;

        try {
            // Desabilita e adiciona loading
            loadFromSalesButton.disabled = true;
            // Salva o ícone original para restaurar depois
            const originalIconHTML = '<span class="material-symbols-outlined">add</span>';
            loadFromSalesButton.innerHTML = `<div class="spinner spinner-small inline-block"></div>`;

            // Requisita as métricas
            const response = await fetchWithAuth('/api/dashboard/metricas'); // O endpoint parece correto
            if (!response.ok) throw new Error('Falha ao buscar total de vendas.');

            const data = await response.json();
            // Confirma o uso de 'faturamentoPeriodo'
            const total = parseFloat(data.faturamentoPeriodo) || 0;

            // Define o valor no input (formatado com vírgula para o usuário)
            totalValueInput.value = total.toFixed(2).replace('.', ',');

            calculatePercentage(); // Recalcula com o novo valor
        } catch (error) {
            alert(`Erro ao carregar o total de vendas: ${error.message}`);
        } finally {
            // Restaura o botão
            loadFromSalesButton.disabled = false;
            // Restaura o ícone original
            loadFromSalesButton.innerHTML = '<span class="material-symbols-outlined">add</span>';
        }
    }

    // --- Event Listeners ---
    totalValueInput.addEventListener('input', calculatePercentage);
    percentageInput.addEventListener('input', calculatePercentage);

    // Botão Adicionar de Vendas (com verificação)
    if (loadFromSalesButton) {
        loadFromSalesButton.addEventListener('click', loadTotalSales);
    } else {
        console.error("Botão Carregar Vendas (ID: load-sales-button) não encontrado no HTML.");
    }


    // Botão Limpar (com verificação)
    if (clearButton) {
        clearButton.addEventListener('click', () => { // <<-- ANTIGA LINHA 73
            totalValueInput.value = '';
            percentageInput.value = '';
            resultInput.value = formatCurrency(0);
            totalValueInput.focus();
        });
    } else {
        // Este erro será logado se o botão Limpar não for encontrado
        console.error("Botão Limpar (ID: clear-button) não encontrado no HTML.");
    }

    // Inicializa com o valor zero
    resultInput.value = formatCurrency(0);
});
