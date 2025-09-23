const pool = require('../config/database');
const cloudinary = require('../config/cloudinary');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Criar um novo produto
exports.criar = async (req, res) => {
    const empresa_id = req.empresaId;
    const { nome, descricao, preco, estoque, categoria, codigo } = req.body;
    const codigoFinal = codigo || '0';
    const files = req.files || [];
    let connection;

    if (!nome || !preco || !estoque) {
        return res.status(400).json({ message: 'Nome, preço e estoque são obrigatórios.' });
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [dbResult] = await connection.query(
            'INSERT INTO produtos (empresa_id, nome, descricao, preco, estoque, categoria, codigo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [empresa_id, nome, descricao, preco, estoque, categoria, codigoFinal]
        );
        const produtoId = dbResult.insertId;

        if (files.length > 0) {
            const [empresaRows] = await connection.query('SELECT slug FROM empresas WHERE id = ?', [empresa_id]);
            if (empresaRows.length === 0 || !empresaRows[0].slug) {
                throw new Error('Diretório da empresa não encontrado.');
            }
            const folderPath = `raposopdv/${empresaRows[0].slug}/produtos`;

            const uploadPromises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: folderPath },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(file.buffer);
                });
            });

            const results = await Promise.all(uploadPromises);
            const fotosParaSalvar = results.map(result => [produtoId, result.secure_url, result.public_id]);
            await connection.query(
                'INSERT INTO produto_fotos (produto_id, url, public_id) VALUES ?',
                [fotosParaSalvar]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Produto criado com sucesso!', produtoId: produtoId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao criar produto.' });
    } finally {
        if (connection) connection.release();
    }
};

// Listar todos os produtos ATIVOS da empresa logada
exports.listarTodos = async (req, res) => {
    const empresa_id = req.empresaId;
    const { sortBy = 'nome-asc' } = req.query;

    const ordenacaoMap = {
        'preco-asc': 'p.preco ASC',
        'preco-desc': 'p.preco DESC',
        'nome-asc': 'p.nome ASC',
        'id-asc': 'p.id ASC',
        'id-desc': 'p.id DESC'
    };

    const orderByClause = ordenacaoMap[sortBy] || 'p.nome ASC';

    try {
        const [rows] = await pool.query(`
            SELECT p.id, p.nome, p.preco, p.estoque, p.codigo,
                   (SELECT url FROM produto_fotos WHERE produto_id = p.id ORDER BY id LIMIT 1) AS foto_url
            FROM produtos p
            WHERE p.ativo = 1 AND p.empresa_id = ?
            ORDER BY ${orderByClause}
        `, [empresa_id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error)
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
        const [fotosRows] = await pool.query('SELECT url FROM produto_fotos WHERE produto_id = ?', [id]);
        const produto = { ...rows[0], fotos: fotosRows.map(f => f.url) };
        res.status(200).json(produto);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter produto.' });
    }
};

// Atualizar um produto existente
exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.empresaId;
    const { nome, descricao, preco, estoque, categoria, codigo } = req.body;
    const codigoFinal = codigo || '0';
    const files = req.files || [];
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [produtoAtualResult] = await connection.query('SELECT public_id FROM produto_fotos WHERE produto_id = ?', [id]);

        if (files.length > 0) {
            if (produtoAtualResult.length > 0) {
                const publicIds = produtoAtualResult.map(f => f.public_id);
                await cloudinary.api.delete_resources(publicIds);
                await connection.query('DELETE FROM produto_fotos WHERE produto_id = ?', [id]);
            }

            const [empresaRows] = await connection.query('SELECT slug FROM empresas WHERE id = ?', [empresa_id]);
            if (empresaRows.length === 0 || !empresaRows[0].slug) {
                throw new Error('Diretório da empresa não encontrado.');
            }
            const folderPath = `raposopdv/${empresaRows[0].slug}/produtos`;

            const uploadPromises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: folderPath },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(file.buffer);
                });
            });

            const results = await Promise.all(uploadPromises);
            const fotosParaSalvar = results.map(result => [id, result.secure_url, result.public_id]);
            await connection.query(
                'INSERT INTO produto_fotos (produto_id, url, public_id) VALUES ?',
                [fotosParaSalvar]
            );
        }

        await connection.query(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, estoque = ?, categoria = ?, codigo = ? WHERE id = ? AND empresa_id = ?',
            [nome, descricao, preco, estoque, categoria, codigoFinal, id, empresa_id]
        );

        await connection.commit();
        res.status(200).json({ message: 'Produto atualizado com sucesso!' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar produto:", error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar produto.' });
    } finally {
        if (connection) connection.release();
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

// Importar produtos via CSV
exports.importarCSV = async (req, res) => {
    const empresa_id = req.empresaId;

    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo CSV enviado.' });
    }

    const produtos = [];
    const fileContent = req.file.buffer.toString('utf8');
    const stream = Readable.from(fileContent);

    stream
        .pipe(csv({
            headers: ['nome', 'codigo', 'preco', 'estoque', 'categoria', 'descricao', 'foto_url', 'foto_public_id'],
            skipLines: 1,
            mapHeaders: ({ header }) => header.trim()
        }))
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
                    const nome = produto.nome || '';
                    const preco = parseFloat(produto.preco) || 0;
                    const estoque = parseInt(produto.estoque, 10) || 0;
                    const categoria = produto.categoria || '';
                    const descricao = produto.descricao || '';
                    const codigo = produto.codigo || '0';
                    const foto_url = produto.foto_url || null;
                    const foto_public_id = produto.foto_public_id || null;

                    // Lógica para a importação de CSV precisa ser ajustada para a nova tabela
                    // Esta é uma versão simplificada, que só salva a primeira foto na nova tabela
                    const [result] = await connection.query(
                        'INSERT INTO produtos (empresa_id, nome, descricao, preco, estoque, categoria, codigo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [empresa_id, nome, descricao, preco, estoque, categoria, codigo]
                    );

                    if (foto_url) {
                        await connection.query(
                            'INSERT INTO produto_fotos (produto_id, url, public_id) VALUES (?, ?, ?)',
                            [result.insertId, foto_url, foto_public_id]
                        );
                    }
                }
                await connection.commit();
                res.status(201).json({ message: `${produtos.length} produtos importados com sucesso!` });
            } catch (error) {
                await connection.rollback();
                console.error('Erro no banco de dados ao importar CSV:', error);
                res.status(500).json({ message: 'Erro ao salvar produtos do CSV no banco de dados.' });
            } finally {
                connection.release();
            }
        });
};