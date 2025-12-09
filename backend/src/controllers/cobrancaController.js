const pool = require('../config/database');

exports.listarFechamento = async (req, res) => {
    const { dataInicio, dataFim } = req.query;
    const empresa_id = req.empresaId;

    if (!dataInicio || !dataFim) {
        return res.status(400).json({ message: 'Data de início e fim são obrigatórias.' });
    }

    try {
        // Busca clientes que compraram no período e junta com a tabela de cobranças (se existir registro)
        const query = `
            SELECT 
                c.id AS cliente_id,
                c.nome AS cliente_nome,
                c.telefone AS cliente_telefone,
                SUM(v.valor_total) AS total_comprado,
                COALESCE(cob.status, 'Pendente') AS status_pagamento
            FROM vendas v
            JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN cobrancas cob ON 
                cob.cliente_id = c.id AND 
                cob.empresa_id = v.empresa_id AND
                cob.data_inicio = ? AND 
                cob.data_fim = ?
            WHERE v.empresa_id = ?
            AND v.data_venda >= ? 
            AND v.data_venda <= CONCAT(?, ' 23:59:59')
            GROUP BY c.id, c.nome, c.telefone, cob.status
            ORDER BY c.nome ASC
        `;

        const [resultados] = await pool.query(query, [dataInicio, dataFim, empresa_id, dataInicio, dataFim]);
        
        res.status(200).json(resultados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao gerar fechamento.' });
    }
};

exports.atualizarStatus = async (req, res) => {
    const { cliente_id, data_inicio, data_fim, status, valor_total } = req.body;
    const empresa_id = req.empresaId;

    try {
        // Usa UPSERT (Insert ou Update se já existir devido à chave única)
        const query = `
            INSERT INTO cobrancas (empresa_id, cliente_id, data_inicio, data_fim, status, valor_total)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), valor_total = VALUES(valor_total)
        `;

        await pool.query(query, [empresa_id, cliente_id, data_inicio, data_fim, status, valor_total]);
        
        res.status(200).json({ message: 'Status atualizado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};
