const API_URL = '';

function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token && !window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

async function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (response.status === 401) {
        logout();
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    
    return response;
}

// --- NOVO CÓDIGO ADICIONADO ABAIXO ---

// Função auto-executável para injetar o script de responsividade.
(function() {
    // Garante que o script só seja adicionado uma vez.
    if (!document.querySelector('script[src="js/responsividade.js"]')) {
        const responsiveScript = document.createElement('script');
        responsiveScript.src = 'js/responsividade.js';
        document.body.appendChild(responsiveScript);
    }
})();
