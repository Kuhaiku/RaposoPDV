const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");
const authMiddleware = require("../middlewares/authMiddleware");
// Importa os dois middlewares de upload
const { uploadImage, uploadCsv } = require("../config/multer");

// --- ROTAS PROTEGIDAS PARA FUNCIONÁRIOS ---
router.use(authMiddleware);

// Rota para LISTAR todos os produtos
router.get("/", produtoController.listarTodos);

// Rota para CRIAR um novo produto (usando upload de imagem)
router.post("/", uploadImage, produtoController.criar);

// Rota para IMPORTAR produtos via CSV (usando upload de CSV)
router.post("/importar-csv", uploadCsv, produtoController.importarCSV);

// Rota para LISTAR os produtos inativos
router.get("/inativos", produtoController.listarInativos);

// Rota para OBTER os dados de UM produto específico
router.get("/:id", produtoController.obterPorId);

// Rota para ATUALIZAR um produto (usando upload de imagem)
router.put("/:id", uploadImage, produtoController.atualizar);

// Rota para REATIVAR um produto
router.put("/:id/reativar", produtoController.reativar);

// Rota para INATIVAR um produto
router.delete("/:id", produtoController.excluir);

module.exports = router;
