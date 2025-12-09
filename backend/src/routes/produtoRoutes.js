const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");
const authMiddleware = require("../middlewares/authMiddleware");
const { uploadImages, uploadCsv } = require("../config/multer"); 

router.use(authMiddleware);

// --- ROTAS ESTÁTICAS (DEVEM VIR PRIMEIRO) ---
router.get("/", produtoController.listarTodos);
router.post("/", uploadImages, produtoController.criar);

router.post("/importar-csv", uploadCsv, produtoController.importarCSV);
router.get("/inativos", produtoController.listarInativos);
router.get("/relatorio-completo", produtoController.listarParaRelatorio);

// Rotas de Ação em Massa (PUT e POST específicos)
// IMPORTANTE: Estas devem vir ANTES de router.put("/:id")
router.put("/inativar-em-massa", produtoController.inativarEmMassa);
router.put("/reativar-em-massa", produtoController.reativarEmMassa); 
router.post("/excluir-em-massa", produtoController.excluirEmMassa); 

// --- ROTAS COM PARÂMETROS (DEVEM VIR POR ÚLTIMO) ---
router.get("/:id", produtoController.obterPorId);
router.put("/:id", uploadImages, produtoController.atualizar);
router.put("/:id/reativar", produtoController.reativar);
router.delete("/:id", produtoController.excluir);

module.exports = router;
