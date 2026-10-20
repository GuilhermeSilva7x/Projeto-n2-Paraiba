
const service = require('../services/contasManualService');

// Salva uma conta cadastrada manualmente
async function criarContaManual(req, res) {
    try {
        const dados = await service.criarContaManual(req.body);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Conta a pagar cadastrada com sucesso!',
            dados
        });

    } catch (erro) {
        console.error(
            'Erro ao cadastrar conta manual:',
            erro.message
        );

        if (erro.code === '23505') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Já existe um lançamento com esses dados.'
            });
        }

        if (erro.code === '23503') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Cadastro relacionado inválido.'
            });
        }

        return res.status(erro.status || 500).json({
            sucesso: false,
            mensagem: erro.status
                ? erro.message
                : 'Erro interno no servidor.'
        });
    }
}

module.exports = {
    criarContaManual
};
