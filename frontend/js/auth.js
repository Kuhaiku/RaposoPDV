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

// --- LÓGICA DE RESPONSIVIDADE INTEGRADA ---

(function() {
    // Função que executa toda a lógica de responsividade
    function setupResponsiveFeatures() {
        // Se a tela for maior que 767px (desktop), não faz nada.
        if (window.innerWidth > 767) {
            return;
        }

        // 1. Injeta a tag <link> para o mobile.css no <head>
        const mobileCssLink = document.createElement('link');
        mobileCssLink.rel = 'stylesheet';
        mobileCssLink.href = 'css/mobile.css';
        document.head.appendChild(mobileCssLink);

        // 2. Cria e injeta o botão do menu (apenas se houver uma sidebar na página)
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const menuToggle = document.createElement('button');
            menuToggle.innerHTML = '&#9776;'; // Ícone de hambúrguer
            menuToggle.className = 'menu-toggle';
            document.body.appendChild(menuToggle);

            // 3. Adiciona a funcionalidade de clique ao botão
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
    }

    // Executa a função assim que o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', setupResponsiveFeatures);
})();
