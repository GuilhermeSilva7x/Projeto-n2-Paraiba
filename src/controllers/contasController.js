
const AgenteAnalisarNF = require('../agentes/agenteAnalisarNF');
const contasService = require('../services/contasService');

const agente = new AgenteAnalisarNF();

// Trata erros das operações
function tratarErro(erro, res) {
    console.error('Erro em Contas:', erro.message);

    if (erro.code === '23505') {
        return res.status(409).json({
            sucesso: false,
            mensagem: 'Cadastro ou lançamento duplicado.'
        });
    }

    if (erro.code === '23503') {
        return res.status(409).json({
            sucesso: false,
            mensagem: 'Relacionamento inválido no banco.'
        });
    }

    return res.status(erro.status || 500).json({
        sucesso: false,
        mensagem: erro.status
            ? erro.message
            : 'Erro interno no servidor.'
    });
}

// Analisa a nota sem gravar no banco
async function analisarConta(req, res) {
    try {
        const analise = await agente.analisar(req.body);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Análise realizada com sucesso!',
            analise
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Salva a nota fiscal pelo segundo agente
async function salvarConta(req, res) {
    try {
        const dados = await agente.salvar(req.body);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Conta a pagar lançada com sucesso!',
            dados
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Lista contas ativas
async function listarContas(req, res) {
    try {
        const resultado = await contasService.listarContas(req.query);

        return res.json({
            sucesso: true,
            ...resultado
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Busca uma conta por ID
async function buscarConta(req, res) {
    try {
        const conta = await contasService.buscarConta(req.params.id);

        return res.json({
            sucesso: true,
            conta
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Edita uma conta
async function editarConta(req, res) {
    try {
        const conta = await contasService.editarConta(
            req.params.id,
            req.body
        );

        return res.json({
            sucesso: true,
            mensagem: 'Conta atualizada com sucesso!',
            conta
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

// Exclui uma conta logicamente
async function excluirConta(req, res) {
    try {
        const conta = await contasService.excluirConta(req.params.id);

        return res.json({
            sucesso: true,
            mensagem: 'Conta excluída com sucesso!',
            conta
        });
    } catch (erro) {
        return tratarErro(erro, res);
    }
}

module.exports = {
    analisarConta,
    salvarConta,
    listarContas,
    buscarConta,
    editarConta,
    excluirConta
};
