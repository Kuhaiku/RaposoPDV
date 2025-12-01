const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Rota para criar uma nova venda
router.post('/', vendaController.criar);

// Rota para listar todas as vendas (resumo)
router.get('/', vendaController.listarTodas);

// Rota para o relatório de itens (IMPORTANTE: Antes de /:id)
router.get('/relatorio/itens', vendaController.relatorioItens);

// Rota para ver detalhes de uma venda
router.get('/:id', vendaController.obterPorId);

// Rota para cancelar uma venda
router.delete('/:id', vendaController.cancelar);

module.exports = router;
