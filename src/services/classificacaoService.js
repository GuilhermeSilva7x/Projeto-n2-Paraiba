
const pool = require('../config/database');

const tiposPermitidos = ['DESPESA', 'RECEITA'];
const colunasPermitidas = ['id', 'tipo', 'descricao'];

// Valida os dados da classificação
function validarClassificacao(dados = {}) {
    const { tipo, descricao } = dados;

    if (
        !tiposPermitidos.includes(tipo) ||
        typeof descricao !== 'string' ||
        !descricao.trim()
    ) {
        const erro = new Error('Tipo ou descrição inválidos.');
        erro.status = 400;
        throw erro;
    }

    return { tipo, descricao: descricao.trim() };
}

// Valida o ID
function validarId(id) {
    if (!/^[1-9]\d*$/.test(String(id))) {
        const erro = new Error('ID inválido.');
        erro.status = 400;
        throw erro;
    }
}

// Cadastra uma classificação
async function criarClassificacao(dados) {
    const { tipo, descricao } = validarClassificacao(dados);

    const resultado = await pool.query(
        `INSERT INTO classificacao (tipo, descricao)
         VALUES ($1, $2)
         RETURNING *`,
        [tipo, descricao]
    );

    return resultado.rows[0];
}

// Lista classificações ativas com filtros
async function listarClassificacoes(filtros = {}) {
    const pagina = Number(filtros.pagina ?? 1);
    const limite = Number(filtros.limite ?? 10);
    const ordenarPor = filtros.ordenarPor || 'id';
    const direcao = String(filtros.direcao || 'asc').toUpperCase();

    if (
        !Number.isSafeInteger(pagina) || pagina < 1 ||
        !Number.isSafeInteger(limite) || limite < 1 || limite > 100
    ) {
        const erro = new Error('Paginação inválida.');
        erro.status = 400;
        throw erro;
    }

    if (
        !colunasPermitidas.includes(ordenarPor) ||
        !['ASC', 'DESC'].includes(direcao)
    ) {
        const erro = new Error('Ordenação inválida.');
        erro.status = 400;
        throw erro;
    }

    const condicoes = ["status = 'ATIVO'"];
    const valores = [];

    if (filtros.busca && String(filtros.busca).trim()) {
        valores.push(`%${String(filtros.busca).trim()}%`);
        condicoes.push(`descricao ILIKE $${valores.length}`);
    }

    if (filtros.tipo) {
        if (!tiposPermitidos.includes(filtros.tipo)) {
            const erro = new Error('Tipo inválido.');
            erro.status = 400;
            throw erro;
        }

        valores.push(filtros.tipo);
        condicoes.push(`tipo = $${valores.length}`);
    }

    const onde = condicoes.join(' AND ');

    const contagem = await pool.query(
        `SELECT COUNT(*) AS total
         FROM classificacao WHERE ${onde}`,
        valores
    );

    const total = Number(contagem.rows[0].total);
    const offset = (pagina - 1) * limite;
    const parametros = [...valores, limite, offset];

    const resultado = await pool.query(
        `SELECT id, tipo, descricao, status
         FROM classificacao
         WHERE ${onde}
         ORDER BY ${ordenarPor} ${direcao}, id ASC
         LIMIT $${parametros.length - 1}
         OFFSET $${parametros.length}`,
        parametros
    );

    return {
        classificacoes: resultado.rows,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
    };
}

// Busca uma classificação ativa pelo ID
async function buscarClassificacao(id) {
    validarId(id);

    const resultado = await pool.query(
        `SELECT * FROM classificacao
         WHERE id = $1 AND status = 'ATIVO'`,
        [id]
    );

    if (!resultado.rows.length) {
        const erro = new Error('Classificação não encontrada ou inativa.');
        erro.status = 404;
        throw erro;
    }

    return resultado.rows[0];
}

// Edita uma classificação ativa
async function editarClassificacao(id, dados) {
    validarId(id);
    const { tipo, descricao } = validarClassificacao(dados);

    const resultado = await pool.query(
        `UPDATE classificacao
         SET tipo = $1, descricao = $2
         WHERE id = $3 AND status = 'ATIVO'
         RETURNING *`,
        [tipo, descricao, id]
    );

    if (!resultado.rows.length) {
        const erro = new Error('Classificação não encontrada ou inativa.');
        erro.status = 404;
        throw erro;
    }

    return resultado.rows[0];
}

// Exclusão lógica
async function excluirClassificacao(id) {
    validarId(id);

    const resultado = await pool.query(
        `UPDATE classificacao
         SET status = 'INATIVO'
         WHERE id = $1 AND status = 'ATIVO'
         RETURNING *`,
        [id]
    );

    if (!resultado.rows.length) {
        const erro = new Error('Classificação não encontrada ou inativa.');
        erro.status = 404;
        throw erro;
    }

    return resultado.rows[0];
}

module.exports = {
    criarClassificacao,
    listarClassificacoes,
    buscarClassificacao,
    editarClassificacao,
    excluirClassificacao
};
