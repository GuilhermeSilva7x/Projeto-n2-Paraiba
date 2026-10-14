
const AgenteAnalisarNF = require('../agentes/agenteAnalisarNF');

const agente = new AgenteAnalisarNF();

// Analisa o JSON sem gravar dados
async function analisarNotaFiscal(req, res) {
    try {
        const resultado = await agente.analisar(req.body);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Análise realizada com sucesso!',
            analise: resultado
        });
    } catch (erro) {
        console.error('Erro na análise:', erro.message);

        return res.status(erro.status || 500).json({
            sucesso: false,
            mensagem: erro.status
                ? erro.message
                : 'Erro interno ao analisar a nota fiscal.'
        });
    }
}

module.exports = {
    analisarNotaFiscal
};
