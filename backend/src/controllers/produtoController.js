const pool = require('../config/database');
const cloudinary = require('../config/cloudinary');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Criar um novo produto (com pasta dinâmica no Cloudinary)
exports.criar = async (req, res) => {
    const empresa_id = req.empresaId;
    const { nome, descricao, preco, estoque, categoria } = req.body;

    // A imagem do produto agora é opcional
    if (!req.file) {
        try {
            const [dbResult] = await pool.query(
                'INSERT INTO produtos (empresa_id, nome, descricao, preco, estoque, categoria) VALUES (?, ?, ?, ?, ?, ?)',
                [empresa_id, nome, descricao, preco, estoque, categoria]
            );
            return res.status(201).json({ message: 'Produto criado com sucesso!', produtoId: dbResult.insertId });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Erro no servidor ao criar produto sem imagem.' });
        }
    }

    try {
        // 1. Busca o slug da empresa para usar como nome da pasta
        const [empresaRows] = await pool.query('SELECT slug FROM empresas WHERE id = ?', [empresa_id]);
        if (empresaRows.length === 0 || !empresaRows[0].slug) {
            return res.status(404).json({ message: 'Diretório da empresa não encontrado.' });
        }
        const folderPath = `raposopdv/${empresaRows[0].slug}/produtos`;

        // 2. Faz o upload para a pasta específica da empresa
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folderPath },
            async (error, result) => {
                if (error) {
                    console.error('Erro no upload para Cloudinary:', error);
                    return res.status(500).json({ message: 'Erro ao fazer upload da imagem.' });
                }

                const [dbResult] = await pool.query(
                    'INSERT INTO produtos (empresa_id, nome, descricao, preco, estoque, categoria, foto_url, foto_public_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [empresa_id, nome, descricao, preco, estoque, categoria, result.secure_url, result.public_id]
                );

                res.status(201).json({ message: 'Produto criado com sucesso!', produtoId: dbResult.insertId });
            }
        );
        uploadStream.end(req.file.buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao criar produto.' });
    }
};

// Listar todos os produtos ATIVOS da empresa logada
exports.listarTodos = async (req, res) => {
    const empresa_id = req.empresaId;
    try {
        const [rows] = await pool.query('SELECT * FROM produtos WHERE ativo = 1 AND empresa_id = ? ORDER BY nome ASC', [empresa_id]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar produtos.' });
    }
};

// Obter um produto específico por ID
exports.obterPorId = async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.empresaId;
    try {
        const [rows] = await pool.query('SELECT * FROM produtos WHERE id = ? AND empresa_id = ?', [id, empresa_id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter produto.' });
    }
};

// Atualizar um produto existente (com pasta dinâmica no Cloudinary)
exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.empresaId;
    const { nome, descricao, preco, estoque, categoria } = req.body;
    try {
        let produtoAtualResult = await pool.query('SELECT foto_url, foto_public_id FROM produtos WHERE id = ? AND empresa_id = ?', [id, empresa_id]);
        if (produtoAtualResult[0].length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        let { foto_url, foto_public_id } = produtoAtualResult[0][0];

        if (req.file) {
            if (foto_public_id) {
                await cloudinary.uploader.destroy(foto_public_id);
            }
            
            // 1. Busca o slug da empresa para salvar a nova foto na pasta correta
            const [empresaRows] = await pool.query('SELECT slug FROM empresas WHERE id = ?', [empresa_id]);
            if (empresaRows.length === 0 || !empresaRows[0].slug) {
                return res.status(404).json({ message: 'Diretório da empresa não encontrado.' });
            }
            const folderPath = `raposopdv/${empresaRows[0].slug}/produtos`;

            // 2. Faz o upload da nova imagem para a pasta dinâmica
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ folder: folderPath }, (error, result) => {
                    if (error) reject(error); else resolve(result);
                });
                uploadStream.end(req.file.buffer);
            });
            foto_url = result.secure_url;
            foto_public_id = result.public_id;
        }

        await pool.query(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, estoque = ?, categoria = ?, foto_url = ?, foto_public_id = ? WHERE id = ? AND empresa_id = ?',
            [nome, descricao, preco, estoque, categoria, foto_url, foto_public_id, id, empresa_id]
        );
        res.status(200).json({ message: 'Produto atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar produto.' });
    }
};

// Inativar um produto
exports.excluir = async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.empresaId;
    try {
        const [result] = await pool.query('UPDATE produtos SET ativo = 0 WHERE id = ? AND empresa_id = ?', [id, empresa_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json({ message: 'Produto inativado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao inativar produto.' });
    }
};

// Listar todos os produtos INATIVOS da empresa logada
exports.listarInativos = async (req, res) => {
    const empresa_id = req.empresaId;
    try {
        const [rows] = await pool.query('SELECT * FROM produtos WHERE ativo = 0 AND empresa_id = ? ORDER BY nome ASC', [empresa_id]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar produtos inativos.' });
    }
};

// Reativar um produto
exports.reativar = async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.empresaId;
    try {
        const [result] = await pool.query('UPDATE produtos SET ativo = 1 WHERE id = ? AND empresa_id = ?', [id, empresa_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json({ message: 'Produto reativado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao reativar produto.' });
    }
};


exports.importarCSV = async (req, res) => {
    const empresa_id = req.empresaId;

    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo CSV enviado.' });
    }

    const produtos = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
        .pipe(csv())
        .on('data', (row) => {
            produtos.push(row);
        })
        .on('end', async () => {
            if (produtos.length === 0) {
                return res.status(400).json({ message: 'O arquivo CSV está vazio ou em formato inválido.' });
            }

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                for (const produto of produtos) {
                    await connection.query(
                        'INSERT INTO produtos (empresa_id, nome, descricao, preco, estoque, categoria) VALUES (?, ?, ?, ?, ?, ?)',
                        [empresa_id, produto.nome, produto.descricao, produto.preco, produto.estoque, produto.categoria]
                    );
                }
                await connection.commit();
                res.status(201).json({ message: `${produtos.length} produtos importados com sucesso!` });
            } catch (error) {
                await connection.rollback();
                console.error(error);
                res.status(500).json({ message: 'Erro ao importar produtos do CSV.' });
            } finally {
                connection.release();
            }
        });
};
