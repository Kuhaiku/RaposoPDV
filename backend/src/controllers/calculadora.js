// kuhaiku/raposopdv/RaposoPDV-769745521c52eoc8dd0eaa6a76ce386c5a6d5e4d/frontend/js/calculadora.js
if (typeof checkAuth !== 'function' || typeof fetchWithAuth !== 'function') {
    console.error("Funções 'checkAuth' ou 'fetchWithAuth' não encontradas.");
} else {
    checkAuth();
}

document.addEventListener('DOMContentLoaded', () => {
    const totalValueInput = document.getElementById('total-value');
    const percentageInput = document.getElementById('percentage');
    const resultInput = document.getElementById('result');
    const clearButton = document.querySelector('footer button');
    // Seletor corrigido para pegar o botão '+' corretamente
    const loadFromSalesButton = document.querySelector('#total-value').closest('.flex').querySelector('button');

    // Função para formatar o valor como moeda
    const formatCurrency = (value) => {
        const number = parseFloat(value) || 0;
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Função principal de cálculo
    const calculatePercentage = () => {
        // Usa regex para remover pontos e trocar vírgula por ponto para o parse
        const rawTotal = totalValueInput.value.replace('.', '').replace(',', '.');
        const rawPercentage = percentageInput.value.replace('.', '').replace(',', '.');
        
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
        try {
            // Desabilita e adiciona loading
            loadFromSalesButton.disabled = true;
            // O spinner será colocado aqui
            const originalIcon = loadFromSalesButton.innerHTML;
            loadFromSalesButton.innerHTML = `<div class="spinner spinner-small inline-block"></div>`; 
            
            // Requisita as métricas
            const response = await fetchWithAuth('/api/dashboard/metricas');
            if (!response.ok) throw new Error('Falha ao buscar total de vendas.');
            
            const data = await response.json();
            const total = parseFloat(data.faturamentoPeriodo) || 0; // Lê a métrica CORRETA
            
            // Define o valor no input (formatado com vírgula para o usuário)
            totalValueInput.value = total.toFixed(2).replace('.', ',');
            
            calculatePercentage(); // Recalcula com o novo valor
        } catch (error) {
            alert(`Erro ao carregar o total de vendas: ${error.message}`);
        } finally {
            // Restaura o botão
            loadFromSalesButton.disabled = false;
            loadFromSalesButton.innerHTML = '<span class="material-symbols-outlined">add</span>';
        }
    }

    // --- Event Listeners ---
    totalValueInput.addEventListener('input', calculatePercentage);
    percentageInput.addEventListener('input', calculatePercentage);
    
    // Botão Adicionar de Vendas
    loadFromSalesButton.addEventListener('click', loadTotalSales);

    // Botão Limpar
    clearButton.addEventListener('click', () => {
        totalValueInput.value = '';
        percentageInput.value = '';
        resultInput.value = formatCurrency(0);
        totalValueInput.focus();
    });
    
    // Inicializa com o valor zero
    resultInput.value = formatCurrency(0);
});
