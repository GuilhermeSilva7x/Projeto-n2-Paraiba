
const pool = require('../config/database');

// Cria erros de validação
function criarErro(mensagem, status = 400) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

// Normaliza documentos e textos
function limparDocumento(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
}

// Valida identificadores
function validarId(id) {
    if (!/^[1-9]\d*$/.test(String(id))) {
        throw criarErro('ID inválido.');
    }
    return String(id);
}

// Valida CPF
function cpfValido(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) {
        return false;
    }

    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(cpf[i]) * (tamanho + 1 - i);
        }

        let digito = (soma * 10) % 11;
        if (digito === 10) digito = 0;

        if (digito !== Number(cpf[tamanho])) return false;
    }

    return true;
}

// Valida CNPJ numérico
function cnpjValido(cnpj) {
    if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) {
        return false;
    }

    const calcular = (tamanho, pesos) => {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(cnpj[i]) * pesos[i];
        }

        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, ...pesos1];

    return calcular(12, pesos1) === Number(cnpj[12]) &&
        calcular(13, pesos2) === Number(cnpj[13]);
}

// Valida datas
function dataValida(valor) {
    if (typeof valor !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return ano >= 1900 &&
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() === mes - 1 &&
        data.getUTCDate() === dia;
}

// Valida valores monetários
function validarValor(valor) {
    if (
        typeof valor !== 'number' ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        valor > 9999999999.99 ||
        !Number.isSafeInteger(Math.round(valor * 100)) ||
        Math.abs(valor * 100 - Math.round(valor * 100)) > 0.000001
    ) {
        throw criarErro('Valor total inválido.');
    }

    return Math.round(valor * 100) / 100;
}

// Valida o JSON extraído da nota fiscal
function validarNota(dados) {
    if (!dados || typeof dados !== 'object' ||
        Array.isArray(dados)) {
        throw criarErro('JSON da nota fiscal inválido.');
    }

    const fornecedor = dados.fornecedor || {};
    const faturado = dados.faturado || {};
    const classificacao = dados.classificacaoDespesa || {};

    const cnpj = limparDocumento(fornecedor.cnpj);
    const cpf = limparDocumento(faturado.cpf);
    const razaoSocial = String(fornecedor.razaoSocial || '').trim();
    const nomeCompleto = String(faturado.nomeCompleto || '').trim();
    const categoria = String(classificacao.categoria || '').trim();
    const numeroNota = String(dados.numeroNotaFiscal || '').trim();

    if (!cnpjValido(cnpj)) {
        throw criarErro('CNPJ do fornecedor inválido.');
    }

    // Permite CPF fictício apenas no ambiente de teste
const permitirCpfTeste = process.env.PERMITIR_CPF_TESTE === 'true';

if (!permitirCpfTeste && !cpfValido(cpf)) {
    throw criarErro('CPF do faturado inválido.');
}

if (permitirCpfTeste && !/^\d{11}$/.test(cpf)) {
    throw criarErro('CPF do faturado deve conter 11 dígitos.');
}

    if (!razaoSocial || !nomeCompleto || !categoria || !numeroNota) {
        throw criarErro('Dados obrigatórios da nota fiscal ausentes.');
    }

    if (
        razaoSocial.length > 150 ||
        nomeCompleto.length > 150 ||
        categoria.length > 150
    ) {
        throw criarErro('Nome ou descrição muito longo.');
    }

    if (!dataValida(dados.dataEmissao) ||
        !dataValida(dados.dataVencimento)) {
        throw criarErro('Data de emissão ou vencimento inválida.');
    }

    if (dados.dataVencimento < dados.dataEmissao) {
        throw criarErro('Vencimento anterior à emissão.');
    }

    if (dados.quantidadeParcelas !== 1) {
        throw criarErro('Somente uma parcela é permitida.');
    }

    const valor = validarValor(dados.valorTotal);
    const identificacao = `NF-${cnpj}-${numeroNota}-1`;

    if (identificacao.length > 100) {
        throw criarErro('Identificação da parcela muito longa.');
    }

    return {
        cnpj,
        cpf,
        razaoSocial,
        nomeCompleto,
        categoria,
        numeroNota,
        valor,
        dataEmissao: dados.dataEmissao,
        dataVencimento: dados.dataVencimento,
        identificacao
    };
}

// Consulta ou cria pessoa
async function obterPessoa(client, tipo, nome, documento) {
    const consulta = await client.query(
        `SELECT id, status FROM pessoas
         WHERE tipo = $1 AND cpfcnpj = $2
         FOR UPDATE`,
        [tipo, documento]
    );

    if (consulta.rows.length) {
        const pessoa = consulta.rows[0];

        if (pessoa.status !== 'ATIVO') {
            throw criarErro(`${tipo} possui cadastro inativo.`, 409);
        }

        return { id: pessoa.id, criado: false };
    }

    const resultado = await client.query(
        `INSERT INTO pessoas (tipo, razaosocial, cpfcnpj)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [tipo, nome, documento]
    );

    return { id: resultado.rows[0].id, criado: true };
}

// Consulta ou cria classificação
async function obterClassificacao(client, descricao) {
    const consulta = await client.query(
        `SELECT id, descricao, status FROM classificacao
         WHERE tipo = 'DESPESA'
         FOR UPDATE`
    );

    const encontrada = consulta.rows.find(
        item => normalizarTexto(item.descricao) ===
            normalizarTexto(descricao)
    );

    if (encontrada) {
        if (encontrada.status !== 'ATIVO') {
            throw criarErro('Classificação possui cadastro inativo.', 409);
        }

        return { id: encontrada.id, criado: false };
    }

    const resultado = await client.query(
        `INSERT INTO classificacao (tipo, descricao)
         VALUES ('DESPESA', $1)
         RETURNING id`,
        [descricao]
    );

    return { id: resultado.rows[0].id, criado: true };
}

// Salva movimento e parcela
async function salvarConta(dados) {
    const nota = validarNota(dados);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existente = await client.query(
            `SELECT id FROM parcelacontas
             WHERE identificacao = $1`,
            [nota.identificacao]
        );

        if (existente.rows.length) {
            throw criarErro('Esta nota fiscal já foi lançada.', 409);
        }

        const fornecedor = await obterPessoa(
            client, 'FORNECEDOR', nota.razaoSocial, nota.cnpj
        );

        const faturado = await obterPessoa(
            client, 'FATURADO', nota.nomeCompleto, nota.cpf
        );

        const classificacao = await obterClassificacao(
            client, nota.categoria
        );

        const movimento = await client.query(
            `INSERT INTO movimentocontas
             (tipo, fornecedorid, faturadoid, classificacaoid,
              descricao, valortotal, dataemissao)
             VALUES ('APAGAR', $1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                fornecedor.id,
                faturado.id,
                classificacao.id,
                `Nota Fiscal ${nota.numeroNota}`,
                nota.valor,
                nota.dataEmissao
            ]
        );

        const parcela = await client.query(
            `INSERT INTO parcelacontas
             (movimentoid, identificacao, numeroparcela,
              valor, datavencimento)
             VALUES ($1, $2, 1, $3, $4)
             RETURNING id, identificacao, valor, datavencimento`,
            [
                movimento.rows[0].id,
                nota.identificacao,
                nota.valor,
                nota.dataVencimento
            ]
        );

        await client.query('COMMIT');

        return {
            movimentoId: movimento.rows[0].id,
            fornecedor,
            faturado,
            classificacao,
            parcela: parcela.rows[0]
        };
    } catch (erro) {
        await client.query('ROLLBACK').catch(console.error);
        throw erro;
    } finally {
        client.release();
    }
}

// Consulta base das contas a pagar
const consultaContas = `
    SELECT
        m.id,
        m.tipo,
        m.fornecedorid,
        f.razaosocial AS fornecedor,
        f.cpfcnpj AS fornecedor_documento,
        m.faturadoid,
        ft.razaosocial AS faturado,
        m.classificacaoid,
        c.descricao AS classificacao,
        m.descricao,
        m.valortotal,
        TO_CHAR(m.dataemissao, 'YYYY-MM-DD') AS dataemissao,
        p.id AS parcelaid,
        p.identificacao,
        p.numeroparcela,
        p.valor AS valorparcela,
        TO_CHAR(p.datavencimento, 'YYYY-MM-DD') AS datavencimento,
        m.status
    FROM movimentocontas m
    JOIN pessoas f ON f.id = m.fornecedorid
    JOIN pessoas ft ON ft.id = m.faturadoid
    JOIN classificacao c ON c.id = m.classificacaoid
    JOIN parcelacontas p ON p.movimentoid = m.id
    WHERE m.tipo = 'APAGAR'
      AND m.status = 'ATIVO'
      AND p.status = 'ATIVO'
`;

// Lista com filtros, ordenação e paginação
async function listarContas(filtros = {}) {
    const pagina = Number(filtros.pagina ?? 1);
    const limite = Number(filtros.limite ?? 10);

    if (!Number.isSafeInteger(pagina) || pagina < 1 ||
        !Number.isSafeInteger(limite) || limite < 1 || limite > 100) {
        throw criarErro('Paginação inválida.');
    }

    const colunas = {
        id: 'm.id',
        fornecedor: 'f.razaosocial',
        faturado: 'ft.razaosocial',
        classificacao: 'c.descricao',
        valor: 'm.valortotal',
        vencimento: 'p.datavencimento',
        identificacao: 'p.identificacao'
    };

    const ordenarPor = filtros.ordenarPor || 'id';
    const direcao = String(filtros.direcao || 'asc').toUpperCase();

    if (!colunas[ordenarPor] ||
        !['ASC', 'DESC'].includes(direcao)) {
        throw criarErro('Ordenação inválida.');
    }

    const valores = [];
    let condicoes = '';

    if (filtros.busca && String(filtros.busca).trim()) {
        valores.push(`%${String(filtros.busca).trim()}%`);

        condicoes += `
            AND (
                f.razaosocial ILIKE $${valores.length}
                OR ft.razaosocial ILIKE $${valores.length}
                OR c.descricao ILIKE $${valores.length}
                OR p.identificacao ILIKE $${valores.length}
                OR f.cpfcnpj LIKE $${valores.length}
            )
        `;
    }

    if (filtros.fornecedorId) {
        valores.push(validarId(filtros.fornecedorId));
        condicoes += ` AND m.fornecedorid = $${valores.length}`;
    }

    if (filtros.classificacaoId) {
        valores.push(validarId(filtros.classificacaoId));
        condicoes += ` AND m.classificacaoid = $${valores.length}`;
    }

    const sqlBase = consultaContas + condicoes;

    const contagem = await pool.query(
        `SELECT COUNT(*) AS total FROM (${sqlBase}) AS resultado`,
        valores
    );

    const total = Number(contagem.rows[0].total);
    const offset = (pagina - 1) * limite;
    const parametros = [...valores, limite, offset];

    const resultado = await pool.query(
        `${sqlBase}
         ORDER BY ${colunas[ordenarPor]} ${direcao}, m.id ASC
         LIMIT $${parametros.length - 1}
         OFFSET $${parametros.length}`,
        parametros
    );

    return {
        contas: resultado.rows,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
    };
}

// Busca uma conta ativa pelo ID
async function buscarConta(id) {
    validarId(id);

    const resultado = await pool.query(
        `${consultaContas} AND m.id = $1`,
        [id]
    );

    if (!resultado.rows.length) {
        throw criarErro('Conta não encontrada ou inativa.', 404);
    }

    return resultado.rows[0];
}

// Confirma que o cadastro relacionado está ativo
async function conferirCadastro(client, tabela, id, tipo) {
    const resultado = await client.query(
        `SELECT id FROM ${tabela}
         WHERE id = $1 AND tipo = $2 AND status = 'ATIVO'
         FOR SHARE`,
        [id, tipo]
    );

    if (!resultado.rows.length) {
        throw criarErro(`Cadastro ${tipo} não encontrado ou inativo.`, 409);
    }
}

// Edita movimento e parcela
async function editarConta(id, dados) {
    validarId(id);

    if (!dados || typeof dados !== 'object') {
        throw criarErro('Dados de edição inválidos.');
    }

    const fornecedorId = validarId(dados.fornecedorId);
    const faturadoId = validarId(dados.faturadoId);
    const classificacaoId = validarId(dados.classificacaoId);
    const valor = validarValor(dados.valorTotal);

    if (!dataValida(dados.dataEmissao) ||
        !dataValida(dados.dataVencimento)) {
        throw criarErro('Datas inválidas.');
    }

    if (dados.dataVencimento < dados.dataEmissao) {
        throw criarErro('Vencimento anterior à emissão.');
    }

    const descricao = String(dados.descricao || '').trim();

    if (descricao.length > 200) {
        throw criarErro('Descrição muito longa.');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const movimento = await client.query(
            `SELECT id FROM movimentocontas
             WHERE id = $1 AND tipo = 'APAGAR'
               AND status = 'ATIVO'
             FOR UPDATE`,
            [id]
        );

        if (!movimento.rows.length) {
            throw criarErro('Conta não encontrada ou inativa.', 404);
        }

        await conferirCadastro(
            client, 'pessoas', fornecedorId, 'FORNECEDOR'
        );

        await conferirCadastro(
            client, 'pessoas', faturadoId, 'FATURADO'
        );

        await conferirCadastro(
            client, 'classificacao', classificacaoId, 'DESPESA'
        );

        const parcelaAtiva = await client.query(
            `SELECT id FROM parcelacontas
             WHERE movimentoid = $1 AND status = 'ATIVO'
             FOR UPDATE`,
            [id]
        );

        if (parcelaAtiva.rows.length !== 1) {
            throw criarErro('A conta deve possuir uma parcela ativa.', 409);
        }

        await client.query(
            `UPDATE movimentocontas
             SET fornecedorid = $1,
                 faturadoid = $2,
                 classificacaoid = $3,
                 descricao = $4,
                 valortotal = $5,
                 dataemissao = $6
             WHERE id = $7`,
            [
                fornecedorId,
                faturadoId,
                classificacaoId,
                descricao,
                valor,
                dados.dataEmissao,
                id
            ]
        );

        await client.query(
            `UPDATE parcelacontas
             SET valor = $1, datavencimento = $2
             WHERE id = $3`,
            [valor, dados.dataVencimento, parcelaAtiva.rows[0].id]
        );

        await client.query('COMMIT');

        return buscarConta(id);
    } catch (erro) {
        await client.query('ROLLBACK').catch(console.error);
        throw erro;
    } finally {
        client.release();
    }
}

// Inativa movimento e parcela
async function excluirConta(id) {
    validarId(id);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const movimento = await client.query(
            `UPDATE movimentocontas
             SET status = 'INATIVO'
             WHERE id = $1 AND tipo = 'APAGAR'
               AND status = 'ATIVO'
             RETURNING id`,
            [id]
        );

        if (!movimento.rows.length) {
            throw criarErro('Conta não encontrada ou inativa.', 404);
        }

        await client.query(
            `UPDATE parcelacontas
             SET status = 'INATIVO'
             WHERE movimentoid = $1 AND status = 'ATIVO'`,
            [id]
        );

        await client.query('COMMIT');

        return {
            id: movimento.rows[0].id,
            status: 'INATIVO'
        };
    } catch (erro) {
        await client.query('ROLLBACK').catch(console.error);
        throw erro;
    } finally {
        client.release();
    }
}

module.exports = {
    salvarConta,
    listarContas,
    buscarConta,
    editarConta,
    excluirConta,
    validarNota
};
