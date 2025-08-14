const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../config/multer");

// --- ROTAS PROTEGIDAS PARA FUNCIONÁRIOS ---
// O middleware de autenticação é aplicado a TODAS as rotas deste arquivo.
router.use(authMiddleware);

// Rota para LISTAR todos os produtos ativos da empresa do funcionário logado.
// GET /api/produtos/
router.get("/", produtoController.listarTodos);

// Rota para CRIAR um novo produto.
// POST /api/produtos/
router.post("/", upload.single("imagem"), produtoController.criar);

// Rota para LISTAR os produtos inativos
// GET /api/produtos/inativos
router.get("/inativos", produtoController.listarInativos);

// Rota para OBTER os dados de UM produto específico pelo seu ID.
// GET /api/produtos/123
router.get("/:id", produtoController.obterPorId);

// Rota para ATUALIZAR um produto existente.
// PUT /api/produtos/123
router.put("/:id", upload.single("imagem"), produtoController.atualizar);

// Rota para REATIVAR um produto.
// PUT /api/produtos/123/reativar
router.put("/:id/reativar", produtoController.reativar);

// Rota para INATIVAR (soft delete) um produto.
// DELETE /api/produtos/123
router.delete("/:id", produtoController.excluir);

module.exports = router;
