const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Registra um novo funcionário (usuário) para uma empresa.
 * Esta é uma rota protegida, acessível apenas por uma empresa autenticada.
 */
exports.registrar = async (req, res) => {
    // Pega o ID da empresa logada, que foi adicionado à requisição pelo middleware 'authEmpresaMiddleware'
    const empresa_id = req.empresaId;
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Nome, email e senha do funcionário são obrigatórios.' });
    }

    try {
        // Criptografa a senha do funcionário antes de salvar
        const senhaHash = await bcrypt.hash(senha, 10);

        // Insere o novo funcionário, associando-o à empresa correta
        const [result] = await pool.query(
            'INSERT INTO usuarios (empresa_id, nome, email, senha_hash) VALUES (?, ?, ?, ?)',
            [empresa_id, nome, email, senhaHash]
        );

        res.status(201).json({ message: 'Funcionário registrado com sucesso!', usuarioId: result.insertId });
    } catch (error) {
        // Trata o erro caso o e-mail do funcionário já exista para esta empresa
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Este e-mail já está em uso por outro funcionário nesta empresa.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Erro ao registrar funcionário.' });
    }
};

/**
 * Autentica um funcionário (usuário).
 * Requer o e-mail da empresa, o e-mail do funcionário e a senha.
 */
exports.login = async (req, res) => {
    const { email_empresa, email_funcionario, senha } = req.body;

    if (!email_empresa || !email_funcionario || !senha) {
        return res.status(400).json({ message: 'Email da empresa, email do funcionário e senha são obrigatórios.' });
    }

    try {
        // Faz uma busca cruzada (JOIN) para garantir que o funcionário pertence à empresa informada
        const [rows] = await pool.query(
            `SELECT u.*, u.empresa_id 
             FROM usuarios u 
             JOIN empresas e ON u.empresa_id = e.id 
             WHERE e.email_contato = ? AND u.email = ?`,
            [email_empresa, email_funcionario]
        );
        const usuario = rows[0];

        // Se nenhum usuário for encontrado, as credenciais estão erradas
        if (!usuario) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Compara a senha enviada com a senha criptografada no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Gera o token de autenticação para o funcionário
        // Importante: o token agora contém tanto o ID do usuário quanto o ID da empresa
        const token = jwt.sign(
            { usuarioId: usuario.id, empresaId: usuario.empresa_id, nome: usuario.nome },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({ message: 'Login do funcionário bem-sucedido!', token: token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor durante o login do funcionário.' });
    }
};

/**
 * Lista todos os funcionários de uma empresa específica.
 * Rota protegida, acessível apenas pela empresa-mãe.
 */
exports.listarTodos = async (req, res) => {
    // Pega o ID da empresa logada a partir do token
    const empresa_id = req.empresaId;

    try {
        const [usuarios] = await pool.query(
            'SELECT id, nome, email FROM usuarios WHERE empresa_id = ? ORDER BY nome ASC',
            [empresa_id]
        );
        res.status(200).json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao listar funcionários.' });
    }
};

/**
 * Redefine a senha de um funcionário específico.
 * Apenas a empresa-mãe pode fazer isso.
 */
exports.redefinirSenha = async (req, res) => {
    const { id } = req.params; // ID do funcionário a ser alterado
    const { novaSenha } = req.body;
    const empresa_id = req.empresaId; // ID da empresa que está logada

    if (!novaSenha || novaSenha.length < 6) {
        return res.status(400).json({ message: 'A nova senha é obrigatória e deve ter no mínimo 6 caracteres.' });
    }

    try {
        const senhaHash = await bcrypt.hash(novaSenha, 10);
        // Garante que a empresa só pode alterar senhas de seus próprios funcionários
        const [result] = await pool.query(
            'UPDATE usuarios SET senha_hash = ? WHERE id = ? AND empresa_id = ?',
            [senhaHash, id, empresa_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado ou não pertence a esta empresa.' });
        }

        res.status(200).json({ message: 'Senha do funcionário atualizada com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao redefinir a senha do funcionário.' });
    }
};

/**
 * Permite que o próprio funcionário logado altere sua senha.
 */
exports.redefinirSenhaPropria = async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    const usuario_id = req.usuarioId; // ID do próprio usuário logado

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ message: 'A senha atual e a nova senha são obrigatórias.' });
    }
    if (novaSenha.length < 6) {
        return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    try {
        const [rows] = await pool.query('SELECT senha_hash FROM usuarios WHERE id = ?', [usuario_id]);
        const usuario = rows[0];

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ message: 'A senha atual está incorreta.' });
        }

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
        await pool.query(
            'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
            [novaSenhaHash, usuario_id]
        );

        res.status(200).json({ message: 'Sua senha foi alterada com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao alterar sua senha.' });
    }
};