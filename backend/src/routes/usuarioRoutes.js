const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const authEmpresaMiddleware = require('../middlewares/authEmpresaMiddleware');

// Rota de login do FUNCIONÁRIO (pública)
router.post('/login', usuarioController.login);

// --- ROTAS PROTEGIDAS POR LOGIN DE EMPRESA ---

// Rota para registrar um novo FUNCIONÁRIO (só a empresa logada pode fazer)
router.post('/registrar', authEmpresaMiddleware, usuarioController.registrar);

// Rota para LISTAR os funcionários da empresa logada
router.get('/', authEmpresaMiddleware, usuarioController.listarTodos);


module.exports = router;