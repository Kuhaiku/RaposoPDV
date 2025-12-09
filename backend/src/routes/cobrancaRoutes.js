const express = require('express');
const router = express.Router();
const cobrancaController = require('../controllers/cobrancaController');
const authMiddleware = require('../middlewares/authMiddleware');
const authEmpresaMiddleware = require('../middlewares/authEmpresaMiddleware');

// Todas as rotas protegidas
router.use(authMiddleware);
router.use(authEmpresaMiddleware);

router.get('/listar', cobrancaController.listarFechamento);
router.post('/atualizar', cobrancaController.atualizarStatus);

module.exports = router;
