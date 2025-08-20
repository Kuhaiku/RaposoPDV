const multer = require('multer');

// Configuração base de armazenamento em memória
const storage = multer.memoryStorage();

// Middleware para upload de IMAGENS
const uploadImage = multer({
    storage: storage,
    limits: {
        fileSize: 7 * 1024 * 1024 // Limite de 7MB
    },
    fileFilter: (req, file, cb) => {
        const mimeTypes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp'];
        if (mimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido. Apenas imagens (jpg, png, gif, webp) são permitidas.'), false);
        }
    }
}).single('imagem'); // Nome do campo para imagem

// Middleware para upload de CSV
const uploadCsv = multer({
    storage: storage,
    limits: {
        fileSize: 7 * 1024 * 1024 // Limite de 7MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido. Apenas arquivos .csv são permitidos.'), false);
        }
    }
}).single('csvfile'); // Nome do campo para CSV

module.exports = { uploadImage, uploadCsv };
