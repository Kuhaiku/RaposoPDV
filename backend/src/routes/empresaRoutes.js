const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');
const authSuperAdminMiddleware = require('../middlewares/authSuperAdminMiddleware');
const authMiddleware = require('../middlewares/authMiddleware'); // Middleware dos funcionários

// --- ROTAS PÚBLICAS ---
router.post('/login', empresaController.login);

// --- ROTA PARA FUNCIONÁRIO LOGADO ---
router.get('/meus-dados', authMiddleware, empresaController.obterDadosDaMinhaEmpresa);

// --- ROTAS PROTEGIDAS (SÓ O SUPER ADMIN ACESSA) ---
router.use(authSuperAdminMiddleware);
router.post('/registrar', empresaController.registrar);
router.get('/ativas', empresaController.listarAtivas);
router.get('/inativas', empresaController.listarInativas);
router.get('/detalhes/:id', empresaController.obterDetalhes);
router.put('/inativar/:id', empresaController.inativar);
router.put('/ativar/:id', empresaController.ativar);

module.exports = router;