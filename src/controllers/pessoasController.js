
const pessoasService = require('../services/pessoasService');

// Trata os erros das operações
function tratarErro(erro, res) {
    console.error('Erro em Pessoas:', erro.message);

    if (
        erro.code === '23505' ||
        erro.message === 'Pessoa já cadastrada.'
    ) {
        return res.status(409).json({
            sucesso: false,
            mensagem: 'Pessoa já cadastrada.'
        });
    }

    if (erro.message === 'Pessoa não encontrada ou inativa.') {
        return res.status(404).json({
            sucesso: false,
            mensagem: erro.message
        });
    }

    const errosValidacao = [
        'Preencha todos os campos obrigatórios.',
        'Tipo de pessoa inválido.',
        'CPF ou CNPJ deve ter 11 ou 14 dígitos.',
        'ID inválido.',
        'Paginação inválida.'
    ];

    if (errosValidacao.includes(erro.message)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: erro.message
        });
    }

    return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno no servidor.'
    });
}

// Cadastra uma pessoa
async function criarPessoa(req, res) {
    try {
        const pessoa = await pessoasService.criarPessoa(req.body);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pessoa cadastrada com sucesso!',
            pessoa
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Lista pessoas com filtros e paginação
async function listarPessoas(req, res) {
    try {
        const resultado = await pessoasService.listarPessoas(req.query);

        return res.status(200).json({
            sucesso: true,
            ...resultado
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Busca uma pessoa pelo ID
async function buscarPessoa(req, res) {
    try {
        const pessoa = await pessoasService.buscarPessoa(req.params.id);

        return res.status(200).json({
            sucesso: true,
            pessoa
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Edita uma pessoa
async function editarPessoa(req, res) {
    try {
        const pessoa = await pessoasService.editarPessoa(
            req.params.id,
            req.body
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pessoa atualizada com sucesso!',
            pessoa
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Inativa uma pessoa
async function excluirPessoa(req, res) {
    try {
        const pessoa = await pessoasService.excluirPessoa(req.params.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pessoa excluída com sucesso!',
            pessoa
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

module.exports = {
    criarPessoa,
    listarPessoas,
    buscarPessoa,
    editarPessoa,
    excluirPessoa
};
