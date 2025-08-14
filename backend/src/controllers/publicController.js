const pool = require('../config/database');

// Busca os dados do catálogo (nome da empresa + produtos ativos) a partir de um slug
exports.obterCatalogoPorSlug = async (req, res) => {
    const { slug } = req.params;
    
    try {
        // 1. Encontra a empresa pelo slug
        const [empresas] = await pool.query('SELECT id, nome_empresa FROM empresas WHERE slug = ? AND ativo = 1', [slug]);
        if (empresas.length === 0) {
            return res.status(404).json({ message: 'Catálogo não encontrado.' });
        }
        const empresa = empresas[0];

        // 2. Busca os produtos ativos daquela empresa
        const [produtos] = await pool.query(
            'SELECT nome, descricao, preco, foto_url FROM produtos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome ASC',
            [empresa.id]
        );

        // 3. Retorna tudo em uma única resposta
        res.status(200).json({
            nome_empresa: empresa.nome_empresa,
            produtos: produtos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao buscar catálogo.' });
    }
};