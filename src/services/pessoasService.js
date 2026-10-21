
const pool = require('../config/database');

const tiposPermitidos = ['CLIENTE', 'FORNECEDOR', 'FATURADO'];

// Valida os dados da pessoa
function validarPessoa(dados) {
    const { tipo, razaoSocial, cpfCnpj } = dados || {};

    if (
        typeof tipo !== 'string' ||
        typeof razaoSocial !== 'string' ||
        !razaoSocial.trim() ||
        cpfCnpj === undefined ||
        cpfCnpj === null
    ) {
        throw new Error('Preencha todos os campos obrigatórios.');
    }

    if (!tiposPermitidos.includes(tipo)) {
        throw new Error('Tipo de pessoa inválido.');
    }

    const documento = String(cpfCnpj).replace(/\D/g, '');

    if (![11, 14].includes(documento.length)) {
        throw new Error('CPF ou CNPJ deve ter 11 ou 14 dígitos.');
    }

    return {
        tipo,
        razaoSocial: razaoSocial.trim(),
        documento
    };
}

// Valida o ID
function validarId(id) {
    if (!/^[1-9]\d*$/.test(String(id))) {
        throw new Error('ID inválido.');
    }

    return id;
}

// Cadastra uma pessoa
async function criarPessoa(dados) {
    const { tipo, razaoSocial, documento } = validarPessoa(dados);

    const existente = await pool.query(
        `SELECT id FROM pessoas
         WHERE cpfcnpj = $1 AND tipo = $2`,
        [documento, tipo]
    );

    if (existente.rows.length > 0) {
        throw new Error('Pessoa já cadastrada.');
    }

    const resultado = await pool.query(
        `INSERT INTO pessoas (tipo, razaosocial, cpfcnpj)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [tipo, razaoSocial, documento]
    );

    return resultado.rows[0];
}

// Lista pessoas ativas com filtros, ordenação e paginação
async function listarPessoas(filtros = {}) {
    const { busca, tipo } = filtros;
    const pagina = Number(filtros.pagina || 1);
    const limite = Number(filtros.limite || 10);

    if (
        !Number.isInteger(pagina) || pagina < 1 ||
        !Number.isInteger(limite) || limite < 1 || limite > 100
    ) {
        throw new Error('Paginação inválida.');
    }

    const colunasPermitidas = {
        id: 'id',
        tipo: 'tipo',
        razaoSocial: 'razaosocial',
        cpfCnpj: 'cpfcnpj'
    };

    const ordenarPor = filtros.ordenarPor || 'id';
    const direcao = String(filtros.direcao || 'ASC').toUpperCase();

    if (!Object.hasOwn(colunasPermitidas, ordenarPor)) {
        throw new Error('Ordenação inválida.');
    }

    if (!['ASC', 'DESC'].includes(direcao)) {
        throw new Error('Ordenação inválida.');
    }

    const coluna = colunasPermitidas[ordenarPor];

    const condicoes = ["status = 'ATIVO'"];
    const valores = [];

    if (busca && String(busca).trim()) {
        valores.push(`%${String(busca).trim()}%`);

        condicoes.push(
            `(razaosocial ILIKE $${valores.length}
              OR cpfcnpj ILIKE $${valores.length})`
        );
    }

    if (tipo) {
        if (!tiposPermitidos.includes(tipo)) {
            throw new Error('Tipo de pessoa inválido.');
        }

        valores.push(tipo);
        condicoes.push(`tipo = $${valores.length}`);
    }

    const onde = condicoes.join(' AND ');

    // Conta os registros encontrados
    const contagem = await pool.query(
        `SELECT COUNT(*) AS total FROM pessoas WHERE ${onde}`,
        valores
    );

    const total = Number(contagem.rows[0].total);
    const offset = (pagina - 1) * limite;

    const parametros = [...valores, limite, offset];

    // Busca os registros da página com ordenação segura
    const resultado = await pool.query(
        `SELECT id, tipo, razaosocial, cpfcnpj, status
         FROM pessoas
         WHERE ${onde}
         ORDER BY ${coluna} ${direcao}, id ASC
         LIMIT $${parametros.length - 1}
         OFFSET $${parametros.length}`,
        parametros
    );

    return {
        pessoas: resultado.rows,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
    };
}

// Busca uma pessoa ativa pelo ID
async function buscarPessoa(id) {
    validarId(id);

    const resultado = await pool.query(
        `SELECT id, tipo, razaosocial, cpfcnpj, status
         FROM pessoas
         WHERE id = $1 AND status = 'ATIVO'`,
        [id]
    );

    if (resultado.rows.length === 0) {
        throw new Error('Pessoa não encontrada ou inativa.');
    }

    return resultado.rows[0];
}

// Edita uma pessoa ativa
async function editarPessoa(id, dados) {
    validarId(id);

    const { tipo, razaoSocial, documento } = validarPessoa(dados);

    const resultado = await pool.query(
        `UPDATE pessoas
         SET tipo = $1,
             razaosocial = $2,
             cpfcnpj = $3
         WHERE id = $4 AND status = 'ATIVO'
         RETURNING *`,
        [tipo, razaoSocial, documento, id]
    );

    if (resultado.rows.length === 0) {
        throw new Error('Pessoa não encontrada ou inativa.');
    }

    return resultado.rows[0];
}

// Inativa uma pessoa sem apagar do banco
async function excluirPessoa(id) {
    validarId(id);

    const resultado = await pool.query(
        `UPDATE pessoas
         SET status = 'INATIVO'
         WHERE id = $1 AND status = 'ATIVO'
         RETURNING *`,
        [id]
    );

    if (resultado.rows.length === 0) {
        throw new Error('Pessoa não encontrada ou inativa.');
    }

    return resultado.rows[0];
}

module.exports = {
    criarPessoa,
    listarPessoas,
    buscarPessoa,
    editarPessoa,
    excluirPessoa
};
