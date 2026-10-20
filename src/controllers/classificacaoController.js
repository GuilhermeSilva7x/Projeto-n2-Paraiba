
const service = require('../services/classificacaoService');

// Trata erros das operações
function tratarErro(erro, res) {
    console.error('Erro em Classificação:', erro.message);

    if (erro.code === '23505') {
        return res.status(409).json({
            sucesso: false,
            mensagem: 'Classificação já cadastrada.'
        });
    }

    return res.status(erro.status || 500).json({
        sucesso: false,
        mensagem: erro.status
            ? erro.message
            : 'Erro interno no servidor.'
    });
}

// Cadastra classificação
async function criarClassificacao(req, res) {
    try {
        const classificacao = await service.criarClassificacao(req.body);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Classificação cadastrada com sucesso!',
            classificacao
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Lista classificações
async function listarClassificacoes(req, res) {
    try {
        const resultado = await service.listarClassificacoes(req.query);

        return res.json({
            sucesso: true,
            ...resultado
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Busca por ID
async function buscarClassificacao(req, res) {
    try {
        const classificacao = await service.buscarClassificacao(req.params.id);

        return res.json({ sucesso: true, classificacao });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Edita classificação
async function editarClassificacao(req, res) {
    try {
        const classificacao = await service.editarClassificacao(
            req.params.id,
            req.body
        );

        return res.json({
            sucesso: true,
            mensagem: 'Classificação atualizada com sucesso!',
            classificacao
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Inativa classificação
async function excluirClassificacao(req, res) {
    try {
        const classificacao = await service.excluirClassificacao(req.params.id);

        return res.json({
            sucesso: true,
            mensagem: 'Classificação excluída com sucesso!',
            classificacao
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

module.exports = {
    criarClassificacao,
    listarClassificacoes,
    buscarClassificacao,
    editarClassificacao,
    excluirClassificacao
};
