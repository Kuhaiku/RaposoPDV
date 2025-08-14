const multer = require('multer');

// Configura o armazenamento em memória
// Não vamos salvar o arquivo no disco do nosso servidor.
// Vamos recebê-lo em memória (buffer) e enviá-lo direto para o Cloudinary.
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB por arquivo
    },
    fileFilter: (req, file, cb) => {
        // Filtra para aceitar apenas imagens
        const mimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (mimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'), false);
        }
    }
});

module.exports = upload;