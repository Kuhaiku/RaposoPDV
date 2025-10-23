// Dentro de auth.js
async function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    // Começa com os headers passados nas opções, ou um objeto vazio
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // *** IMPORTANTE: NÃO definir Content-Type se for FormData ***
    if (!(options.body instanceof FormData)) {
        // Define Content-Type apenas para outros tipos de body (ex: JSON)
        // Se já não estiver definido nas opções
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
    }
    // Se for FormData, o navegador cuidará do Content-Type (multipart/form-data; boundary=...)

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options, // Inclui method, body, etc.
            headers: headers // Usa os headers montados
        });

        if (response.status === 401) {
            logout(); // Assumindo que a função logout existe
            throw new Error('Sessão expirada ou inválida. Faça login novamente.');
        }

        // Deixa a verificação de response.ok para a função que chamou o fetch
        return response;

    } catch (error) {
         console.error(`Erro na requisição para ${endpoint}:`, error);
         // Você pode querer relançar o erro ou retornar uma resposta padrão de erro
         // Dependendo de como você quer tratar erros de rede/fetch
         throw error; // Relança o erro para ser pego pelo catch no local da chamada
    }
}

// O restante do auth.js continua igual...
