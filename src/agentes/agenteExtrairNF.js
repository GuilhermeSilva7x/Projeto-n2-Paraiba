const{ GoogleGenAI} = require('@google/genai');


class agenteExtrairNF{
    constructor()
    {
      
    }

    instrucoes(){
        return `
        Voce e um agente especilizado em Notas fiscais enviadas em PDF.
        Seu objetivo e extrair os dados e responder no formato JSON seguindo esta estrutura:

        {
        "fornecedor": {
        "razaoSocial": "Razão Social ou  null",
        "nomeFantasia": "Nome Fantasia ou null",
        "cnpj": "CNPJ limpo"
        },

        "faturado": {
        "nomeCompleto": "Nome Completo ou null",
        "cpf":"CPF ou null"
        },

        "numeroNotaFiscal": "Número da NF",
        "dataEmissao": "YYYY-MM-DD",
        "descricaoProdutos": ["produto 1", "produto 2"],
        "quantidadeParcelas": 1,
        "dataVencimento": "YYYY-MM-DD",
        "valorTotal": 0.00,
        "classificacaoDespesa": {
        "categoria": "NOME DA CATEGORIA",
        "justificativa": "Motivo da escolha"
        }
     }
        Categorias Obrigatorias de despesas para a classificar:
        1)Insumos Agrícolas(Sementes, Fertilizantes, Defensivos agrícolas, Corretivos)
        2)Manutenção e Operação(Combustíveis, Lubrificantes, Peças, Parafusos, Componentes Mecânicos, Manutenção de Máquinas e Equipamentos, Pneus, Filtros, Correias, Ferramentas e Utensílios)
        3)Recursos Humnanos(Mão de Obra Temporária, Salários e Emcargos)
        4)Serviços Operacionais(Frete, Transporte, Colheita Tercerizada, Secagem, Armazenamento, Pulverização, Aplicação)
        5)Infraestrutura e Utilidades(Energia Elétrica, Arrendamento de Terras, Construções, Reformas, Materiasi de Construção)
        6)Administrativas(Honorários Contábeis,Honorários Advocatícios, Honorários Agronômicos,Despesas Bancárias, Despesas Financeiras)
        7)Seguros e Proteção(Seguro Agrícola, Seguro de Ativos, Seguro Prestamista)
        8)Impostos e Taxas(ITR, IPTU, IPVA, INCRA-CCIR)
        9)Investimentos(Aquisições de Máquinas, Aquisições de Implementos,Aquisições de Veículos, Aquisições de Imóveis, Infraestrutura Rural)

        Retorne apenas JSON puro.`;
        
    }

    async executar(bufferPdf, apiKey){
        try{

            const ai = new GoogleGenAI({apiKey: apiKey});

            const prompt = this.instrucoes();

            const resposta = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        inlineData:{
                            data: bufferPdf.toString('base64'),
                            mimeType: 'application/pdf'
                        }
                    },
                    prompt
                ]

            });

            let texto = resposta.text.trim();

            texto = texto.replace(/^```json\s*/i,'').replace(/```$/i,'').trim();

            const resultadoJSON =JSON.parse(texto);
            return resultadoJSON;
        }

        catch(erro){
            console.error("Erro no agente", erro);
            throw new Error("Falha ao processar NF :" + erro.message);
        }

    }
}
 module.exports = agenteExtrairNF;