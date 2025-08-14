const pool = require('../config/database');

// ... a função 'criar' continua a mesma ...
exports.criar = async (req, res) => {
    const { cliente_id, itens } = req.body;
    const usuario_id = req.usuarioId;
    if (!itens || itens.length === 0) {
        return res.status(400).json({ message: 'A venda deve conter pelo menos um item.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        let valor_total = 0;
        for (const item of itens) {
            const [rows] = await connection.query('SELECT preco, estoque FROM produtos WHERE id = ?', [item.produto_id]);
            const produto = rows[0];
            if (!produto) {
                await connection.rollback();
                return res.status(404).json({ message: `Produto com ID ${item.produto_id} não encontrado.` });
            }
            if (produto.estoque < item.quantidade) {
                await connection.rollback();
                return res.status(400).json({ message: `Estoque insuficiente para o produto ID ${item.produto_id}.` });
            }
            valor_total += produto.preco * item.quantidade;
        }
        const [vendaResult] = await connection.query('INSERT INTO vendas (cliente_id, usuario_id, valor_total) VALUES (?, ?, ?)', [cliente_id, usuario_id, valor_total]);
        const venda_id = vendaResult.insertId;
        for (const item of itens) {
            const [rows] = await connection.query('SELECT preco FROM produtos WHERE id = ?', [item.produto_id]);
            const produto = rows[0];
            await connection.query('INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)', [venda_id, item.produto_id, item.quantidade, produto.preco]);
            await connection.query('UPDATE produtos SET estoque = estoque - ? WHERE id = ?', [item.quantidade, item.produto_id]);
        }
        await connection.commit();
        res.status(201).json({ message: 'Venda registrada com sucesso!', vendaId: venda_id });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao registrar a venda.' });
    } finally {
        if (connection) connection.release();
    }
};


// Listar todas as vendas COM FILTROS
exports.listarTodas = async (req, res) => {
    // Extrai os possíveis filtros da URL (query parameters)
    const { dataInicio, dataFim, cliente, vendedor } = req.query;

    let query = `
        SELECT 
            v.id, 
            v.valor_total, 
            v.data_venda, 
            c.nome AS cliente_nome, 
            u.nome AS usuario_nome
        FROM vendas AS v
        LEFT JOIN clientes AS c ON v.cliente_id = c.id
        JOIN usuarios AS u ON v.usuario_id = u.id
    `;
    
    const conditions = [];
    const params = [];

    if (dataInicio) {
        conditions.push("v.data_venda >= ?");
        params.push(dataInicio);
    }
    if (dataFim) {
        // Adiciona 1 dia e usa '<' para incluir todo o dia da data final
        conditions.push("v.data_venda < DATE_ADD(?, INTERVAL 1 DAY)");
        params.push(dataFim);
    }
    if (cliente) {
        conditions.push("c.nome LIKE ?");
        params.push(`%${cliente}%`);
    }
    if (vendedor) {
        conditions.push("v.usuario_id = ?");
        params.push(vendedor);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY v.data_venda DESC";

    try {
        const [vendas] = await pool.query(query, params);
        res.status(200).json(vendas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao listar vendas.' });
    }
};

// ... a função obterPorId continua a mesma ...
exports.obterPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const [vendaRows] = await pool.query(`SELECT v.id, v.valor_total, v.data_venda, c.id AS cliente_id, c.nome AS cliente_nome, u.nome AS usuario_nome FROM vendas AS v LEFT JOIN clientes AS c ON v.cliente_id = c.id JOIN usuarios AS u ON v.usuario_id = u.id WHERE v.id = ?`, [id]);
        if (vendaRows.length === 0) {
            return res.status(404).json({ message: 'Venda não encontrada.' });
        }
        const [itensRows] = await pool.query(`SELECT vi.quantidade, vi.preco_unitario, p.nome AS produto_nome FROM venda_itens AS vi JOIN produtos AS p ON vi.produto_id = p.id WHERE vi.venda_id = ?`, [id]);
        const vendaDetalhada = { ...vendaRows[0], itens: itensRows };
        res.status(200).json(vendaDetalhada);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao obter detalhes da venda.' });
    }
};
exports.criar = async (req, res) => {
    const { cliente_id, itens } = req.body;
    const usuario_id = req.usuarioId;
    const empresa_id = req.empresaId; // Pega o empresa_id do middleware
    if (!itens || itens.length === 0) {
        return res.status(400).json({ message: 'A venda deve conter pelo menos um item.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        let valor_total = 0;
        for (const item of itens) {
            const [rows] = await connection.query('SELECT preco, estoque FROM produtos WHERE id = ?', [item.produto_id]);
            const produto = rows[0];
            if (!produto) {
                await connection.rollback();
                return res.status(404).json({ message: `Produto com ID ${item.produto_id} não encontrado.` });
            }
            if (produto.estoque < item.quantidade) {
                await connection.rollback();
                return res.status(400).json({ message: `Estoque insuficiente para o produto ID ${item.produto_id}.` });
            }
            valor_total += produto.preco * item.quantidade;
        }
        const [vendaResult] = await connection.query('INSERT INTO vendas (cliente_id, usuario_id, empresa_id, valor_total) VALUES (?, ?, ?, ?)', [cliente_id, usuario_id, empresa_id, valor_total]);
        const venda_id = vendaResult.insertId;
        for (const item of itens) {
            const [rows] = await connection.query('SELECT preco FROM produtos WHERE id = ?', [item.produto_id]);
            const produto = rows[0];
            await connection.query('INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)', [venda_id, item.produto_id, item.quantidade, produto.preco]);
            await connection.query('UPDATE produtos SET estoque = estoque - ? WHERE id = ?', [item.quantidade, item.produto_id]);
        }
        await connection.commit();
        res.status(201).json({ message: 'Venda registrada com sucesso!', vendaId: venda_id });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao registrar a venda.' });
    } finally {
        if (connection) connection.release();
    }
};