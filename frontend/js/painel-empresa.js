const API_URL = '';

// Função de Autenticação para a EMPRESA
function checkEmpresaAuth() {
    const token = localStorage.getItem('empresaAuthToken');
    if (!token) {
        window.location.href = 'login-empresa.html';
    }
    return token;
}

// Função de Logout para a EMPRESA
function logoutEmpresa() {
    localStorage.removeItem('empresaAuthToken');
    window.location.href = 'login-empresa.html';
}

// Função para fazer requisições autenticadas como EMPRESA
async function fetchWithEmpresaAuth(endpoint, options = {}) {
    const token = checkEmpresaAuth();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (response.status === 401) {
        logoutEmpresa();
    }
    return response;
}


document.addEventListener('DOMContentLoaded', () => {
    checkEmpresaAuth();

    const nomeEmpresaHeader = document.getElementById('nome-empresa-header');
    const logoutBtn = document.getElementById('logout-empresa-btn');
    const funcionariosTableBody = document.getElementById('funcionarios-table-body');
    const addFuncionarioForm = document.getElementById('add-funcionario-form');
    const successMessageDiv = document.getElementById('success-message');

    // Decodifica o token para pegar o nome da empresa
    try {
        const token = localStorage.getItem('empresaAuthToken');
        const payload = JSON.parse(atob(token.split('.')[1]));
        nomeEmpresaHeader.textContent = payload.nomeEmpresa;
    } catch (e) {
        nomeEmpresaHeader.textContent = "Empresa";
    }

    async function carregarFuncionarios() {
        try {
            const response = await fetchWithEmpresaAuth('/api/usuarios');
            const funcionarios = await response.json();
            funcionariosTableBody.innerHTML = '';
            funcionarios.forEach(func => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${func.nome}</td><td>${func.email}</td>`;
                funcionariosTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
        }
    }

    addFuncionarioForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const novoFuncionario = {
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            senha: document.getElementById('senha').value,
        };
        try {
            const response = await fetchWithEmpresaAuth('/api/usuarios/registrar', {
                method: 'POST',
                body: JSON.stringify(novoFuncionario)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            addFuncionarioForm.reset();
            successMessageDiv.textContent = 'Funcionário salvo com sucesso!';
            setTimeout(() => { successMessageDiv.textContent = ''; }, 3000);
            carregarFuncionarios(); // Recarrega a lista
        } catch (error) {
            alert(error.message);
        }
    });

    logoutBtn.addEventListener('click', logoutEmpresa);
    carregarFuncionarios();
});