const express = require("express");
const router = express.Router();
const produtoController = require("../controllers/produtoController");
const authMiddleware = require("../middlewares/authMiddleware");
const { uploadImages, uploadCsv } = require("../config/multer"); 

router.use(authMiddleware);

router.get("/", produtoController.listarTodos);
router.post("/", uploadImages, produtoController.criar);
router.post("/importar-csv", uploadCsv, produtoController.importarCSV);
router.get("/inativos", produtoController.listarInativos);
router.get("/:id", produtoController.obterPorId);
router.put("/:id", uploadImages, produtoController.atualizar);
router.put("/:id/reativar", produtoController.reativar);
router.delete("/:id", produtoController.excluir);

// NOVAS ROTAS EM MASSA
router.put("/inativar-em-massa", produtoController.inativarEmMassa);
router.post("/excluir-em-massa", produtoController.excluirEmMassa); // Usando POST para receber body com array de IDs

module.exports = router;