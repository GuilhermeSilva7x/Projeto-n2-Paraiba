
const pool = require('../config/database');

// Cria erros de validação
function criarErro(mensagem, status = 400) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

// Valida IDs
function validarId(valor, campo) {
    const texto = String(valor ?? '');

    if (!/^[1-9]\d*$/.test(texto)) {
        throw criarErro(`${campo} inválido.`);
    }

    return texto;
}

// Valida datas
function validarData(valor) {
    if (
        typeof valor !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {
        return false;
    }

    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return ano >= 1900 &&
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() === mes - 1 &&
        data.getUTCDate() === dia;
}

// Valida o valor monetário
function validarValor(valor) {
    if (
        typeof valor !== 'number' ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        valor > 9999999999.99 ||
        Math.abs(
            valor * 100 - Math.round(valor * 100)
        ) > 0.000001
    ) {
        throw criarErro('Valor total inválido.');
    }

    return Math.round(valor * 100) / 100;
}

// Valida os campos da nova conta
function validarConta(dados) {
    if (
        !dados ||
        typeof dados !== 'object' ||
        Array.isArray(dados)
    ) {
        throw criarErro('Dados da conta inválidos.');
    }

    const fornecedorId = validarId(
        dados.fornecedorId,
        'Fornecedor'
    );

    const faturadoId = validarId(
        dados.faturadoId,
        'Faturado'
    );

    const classificacaoId = validarId(
        dados.classificacaoId,
        'Classificação'
    );

    const descricao = String(dados.descricao || '').trim();

    if (!descricao || descricao.length > 200) {
        throw criarErro(
            'Informe uma descrição com até 200 caracteres.'
        );
    }

    const valorTotal = validarValor(dados.valorTotal);

    if (
        !validarData(dados.dataEmissao) ||
        !validarData(dados.dataVencimento)
    ) {
        throw criarErro('Data de emissão ou vencimento inválida.');
    }

    if (dados.dataVencimento < dados.dataEmissao) {
        throw criarErro(
            'O vencimento não pode ser anterior à emissão.'
        );
    }

    return {
        fornecedorId,
        faturadoId,
        classificacaoId,
        descricao,
        valorTotal,
        dataEmissao: dados.dataEmissao,
        dataVencimento: dados.dataVencimento
    };
}

// Confere pessoa ativa do tipo esperado
async function conferirPessoa(client, id, tipo) {
    const resultado = await client.query(
        `SELECT id
         FROM pessoas
         WHERE id = $1
           AND tipo = $2
           AND status = 'ATIVO'
         FOR SHARE`,
        [id, tipo]
    );

    if (!resultado.rows.length) {
        throw criarErro(
            `${tipo} não encontrado ou inativo.`,
            409
        );
    }
}

// Confere classificação de despesa ativa
async function conferirClassificacao(client, id) {
    const resultado = await client.query(
        `SELECT id
         FROM classificacao
         WHERE id = $1
           AND tipo = 'DESPESA'
           AND status = 'ATIVO'
         FOR SHARE`,
        [id]
    );

    if (!resultado.rows.length) {
        throw criarErro(
            'Classificação de despesa não encontrada ou inativa.',
            409
        );
    }
}

// Salva uma conta manual com uma parcela
async function criarContaManual(dados) {
    const conta = validarConta(dados);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await conferirPessoa(
            client,
            conta.fornecedorId,
            'FORNECEDOR'
        );

        await conferirPessoa(
            client,
            conta.faturadoId,
            'FATURADO'
        );

        await conferirClassificacao(
            client,
            conta.classificacaoId
        );

        // Cria o movimento a pagar
        const movimento = await client.query(
            `INSERT INTO movimentocontas
             (
                tipo,
                fornecedorid,
                faturadoid,
                classificacaoid,
                descricao,
                valortotal,
                dataemissao
             )
             VALUES ('APAGAR', $1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                conta.fornecedorId,
                conta.faturadoId,
                conta.classificacaoId,
                conta.descricao,
                conta.valorTotal,
                conta.dataEmissao
            ]
        );

        const movimentoId = movimento.rows[0].id;

        // Gera uma identificação única da parcela
        const identificacao = `MANUAL-${movimentoId}-1`;

        // Cria somente uma parcela
        const parcela = await client.query(
            `INSERT INTO parcelacontas
             (
                movimentoid,
                identificacao,
                numeroparcela,
                valor,
                datavencimento
             )
             VALUES ($1, $2, 1, $3, $4)
             RETURNING id, identificacao`,
            [
                movimentoId,
                identificacao,
                conta.valorTotal,
                conta.dataVencimento
            ]
        );

        await client.query('COMMIT');

        return {
            movimentoId,
            parcelaId: parcela.rows[0].id,
            identificacao: parcela.rows[0].identificacao
        };

    } catch (erro) {
        await client.query('ROLLBACK').catch(console.error);
        throw erro;

    } finally {
        client.release();
    }
}

module.exports = {
    criarContaManual
};
