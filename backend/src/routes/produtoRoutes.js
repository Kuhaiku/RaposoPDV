// ./backend/src/routes/produtoRoutes.js
const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");
const authMiddleware = require("../middlewares/authMiddleware");
const { uploadImages, uploadCsv } = require("../config/multer"); 

router.use(authMiddleware);

router.get("/", produtoController.listarTodos);
router.post("/", uploadImages, produtoController.criar);

// Rotas específicas
router.post("/importar-csv", uploadCsv, produtoController.importarCSV);
router.get("/inativos", produtoController.listarInativos);
router.put("/inativar-em-massa", produtoController.inativarEmMassa);
router.put("/reativar-em-massa", produtoController.reativarEmMassa); // NOVA ROTA
router.post("/excluir-em-massa", produtoController.excluirEmMassa); 
router.get("/relatorio-completo", produtoController.listarParaRelatorio);

// Rotas com parâmetros
router.get("/:id", produtoController.obterPorId);
router.put("/:id", uploadImages, produtoController.atualizar);
router.put("/:id/reativar", produtoController.reativar);
router.delete("/:id", produtoController.excluir);

module.exports = router;
