
const pool = require('../config/database');

// Normaliza textos para comparação
function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
}

// Consulta uma pessoa ativa pelo documento
async function consultarPessoa(documento, tipo) {
    const documentoLimpo = String(documento || '').replace(/\D/g, '');

    if (!documentoLimpo) {
        return {
            existe: false,
            id: null,
            documento: null,
            mensagem: 'Documento não informado.'
        };
    }

    const resultado = await pool.query(
        `SELECT id, tipo, razaosocial, cpfcnpj
         FROM pessoas
         WHERE tipo = $1
           AND cpfcnpj = $2
           AND status = 'ATIVO'
         LIMIT 1`,
        [tipo, documentoLimpo]
    );

    if (!resultado.rows.length) {
        return {
            existe: false,
            id: null,
            documento: documentoLimpo
        };
    }

    return {
        existe: true,
        id: resultado.rows[0].id,
        nome: resultado.rows[0].razaosocial,
        documento: resultado.rows[0].cpfcnpj
    };
}

// Consulta uma classificação ativa pela descrição
async function consultarClassificacao(categoria) {
    const descricao = String(categoria || '').trim();

    if (!descricao) {
        return {
            existe: false,
            id: null,
            descricao: null,
            mensagem: 'Classificação não informada.'
        };
    }

    const resultado = await pool.query(
        `SELECT id, descricao
         FROM classificacao
         WHERE tipo = 'DESPESA'
           AND status = 'ATIVO'`
    );

    const encontrada = resultado.rows.find(
        item => normalizarTexto(item.descricao) === normalizarTexto(descricao)
    );

    if (!encontrada) {
        return {
            existe: false,
            id: null,
            descricao
        };
    }

    return {
        existe: true,
        id: encontrada.id,
        descricao: encontrada.descricao
    };
}

// Analisa os dados extraídos da nota fiscal
async function analisarNotaFiscal(dados) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
        const erro = new Error('JSON da nota fiscal inválido.');
        erro.status = 400;
        throw erro;
    }

    const fornecedor = dados.fornecedor || {};
    const faturado = dados.faturado || {};
    const classificacao = dados.classificacaoDespesa || {};

    const [resultadoFornecedor, resultadoFaturado, resultadoClassificacao] =
        await Promise.all([
            consultarPessoa(fornecedor.cnpj, 'FORNECEDOR'),
            consultarPessoa(faturado.cpf, 'FATURADO'),
            consultarClassificacao(classificacao.categoria)
        ]);

    return {
        fornecedor: {
            ...resultadoFornecedor,
            razaoSocial: fornecedor.razaoSocial || null
        },
        faturado: {
            ...resultadoFaturado,
            nomeCompleto: faturado.nomeCompleto || null
        },
        despesa: resultadoClassificacao,
        resumo: {
            cadastrosExistentes: [
                resultadoFornecedor,
                resultadoFaturado,
                resultadoClassificacao
            ].filter(item => item.existe).length,
            cadastrosNaoEncontrados: [
                resultadoFornecedor,
                resultadoFaturado,
                resultadoClassificacao
            ].filter(item => !item.existe).length
        }
    };
}

module.exports = {
    analisarNotaFiscal
};
