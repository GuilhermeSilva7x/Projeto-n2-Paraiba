
const analiseService = require('../services/analiseService');
const contasService = require('../services/contasService');

class agenteAnalisarNF {
    // Define as responsabilidades do agente
    instrucoes() {
        return {
            objetivo: 'Analisar e registrar contas a pagar.',
            regras: [
                'Consultar fornecedor pelo CNPJ.',
                'Consultar faturado pelo CPF.',
                'Consultar classificação da despesa.',
                'Informar existência e IDs dos cadastros.',
                'Não gravar dados durante a análise.',
                'Registrar somente contas a pagar.',
                'Utilizar uma despesa e uma parcela.',
                'Criar cadastros ausentes ao salvar.',
                'Não reativar cadastros inativos.',
                'Não excluir registros fisicamente.'
            ]
        };
    }

    // Consulta os cadastros no PostgreSQL
    async analisar(dadosJSON) {
        return analiseService.analisarNotaFiscal(dadosJSON);
    }

    // Persiste a conta e sua parcela
    async salvar(dadosJSON) {
        return contasService.salvarConta(dadosJSON);
    }
}

module.exports = agenteAnalisarNF;
