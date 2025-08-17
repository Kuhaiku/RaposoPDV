const multer = require('multer');

// Configura o armazenamento em memória
// Não vamos salvar o arquivo no disco do nosso servidor.
// Vamos recebê-lo em memória (buffer) e enviá-lo direto para o Cloudinary.
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 7 * 1024 * 1024 // Limite de 7MB por arquivo
    },
    fileFilter: (req, file, cb) => {
        // Filtra para aceitar apenas imagens
        // ADICIONAMOS MAIS TIPOS DE IMAGEM AQUI PARA SER MAIS COMPLETO
        const mimeTypes = [
            'image/jpeg', // Para arquivos .jpg e .jpeg
            'image/pjpeg', // Variação para JPEGs progressivos
            'image/png',
            'image/gif',
            'image/webp'
        ];

        if (mimeTypes.includes(file.mimetype)) {
            // Se o tipo do arquivo estiver na lista, permite o upload
            cb(null, true);
        } else {
            // Se não estiver, rejeita com uma mensagem de erro clara
            cb(new Error('Tipo de arquivo inválido. Apenas imagens (jpg, png, gif, webp) são permitidas.'), false);
        }
    }
});

module.exports = upload;
