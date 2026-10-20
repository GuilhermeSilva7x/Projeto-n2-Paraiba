
import { requisicao } from "./api.js";

const $ = (id) => document.getElementById(id);

// Estado da análise
const estado = {
    jsonAnalisado: null,
    versao: 0,
    analisando: false,
    salvando: false,
    salvo: false
};

// Lê o JSON do extrator
function lerTextoJSON() {
    const campo = $("json-output");

    if (!campo) return "";

    if ("value" in campo) {
        return campo.value.trim();
    }

    return campo.textContent.trim();
}

// Converte a saída em JSON
function obterJSON() {
    let texto = lerTextoJSON();

    if (!texto || texto === "Aguardando PDF") {
        throw new Error("Extraia uma nota fiscal primeiro.");
    }

    if (texto.startsWith("```")) {
        texto = texto
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/, "")
            .trim();
    }

    try {
        const dados = JSON.parse(texto);

        if (
            !dados ||
            typeof dados !== "object" ||
            Array.isArray(dados)
        ) {
            throw new Error();
        }

        return dados;
    } catch {
        throw new Error("O JSON extraído é inválido.");
    }
}

// Verifica datas
function dataValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    return ano >= 1900 &&
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() === mes - 1 &&
        data.getUTCDate() === dia;
}

// Valida os campos principais
function validarNota(dados) {
    const fornecedor = dados.fornecedor || {};
    const faturado = dados.faturado || {};
    const despesa = dados.classificacaoDespesa || {};

    const cnpj = String(fornecedor.cnpj || "")
        .replace(/\D/g, "");

    const cpf = String(faturado.cpf || "")
        .replace(/\D/g, "");

    if (cnpj.length !== 14 || cpf.length !== 11) {
        throw new Error(
            "Confira o CNPJ do fornecedor e o CPF do faturado."
        );
    }

    if (
        !String(fornecedor.razaoSocial || "").trim() ||
        !String(faturado.nomeCompleto || "").trim() ||
        !String(despesa.categoria || "").trim() ||
        !String(dados.numeroNotaFiscal || "").trim()
    ) {
        throw new Error(
            "A nota possui campos obrigatórios ausentes."
        );
    }

    if (
        !dataValida(dados.dataEmissao) ||
        !dataValida(dados.dataVencimento)
    ) {
        throw new Error("Datas inválidas na nota fiscal.");
    }

    if (dados.dataVencimento < dados.dataEmissao) {
        throw new Error(
            "O vencimento não pode ser anterior à emissão."
        );
    }

    if (dados.quantidadeParcelas !== 1) {
        throw new Error("A nota deve possuir uma única parcela.");
    }

    const valor = dados.valorTotal;

    if (
        typeof valor !== "number" ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        valor > 9999999999.99 ||
        Math.abs(valor * 100 - Math.round(valor * 100)) >
            0.000001
    ) {
        throw new Error("Valor da nota fiscal inválido.");
    }
}

// Mostra a mensagem da análise
function mostrarMensagem(texto, tipo = "") {
    const elemento = $("mensagem-analise-nf");

    elemento.textContent = texto;
    elemento.className = tipo
        ? `mensagem-analise-nf ${tipo}`
        : "mensagem-analise-nf";

    elemento.hidden = !texto;
}

// Atualiza os botões
function atualizarBotoes() {
    const analisar = $("btn-analisar-nf");
    const salvar = $("btn-salvar-nf");

    if (!analisar || !salvar) return;

    const ocupado = estado.analisando || estado.salvando;

    analisar.disabled =
        ocupado ||
        estado.salvo ||
        !lerTextoJSON();

    salvar.disabled =
        ocupado ||
        estado.salvo ||
        !estado.jsonAnalisado;

    analisar.textContent = estado.analisando
        ? "Analisando..."
        : "Analisar dados";

    salvar.textContent = estado.salvando
        ? "Salvando..."
        : "Salvar no banco";
}

// Invalida uma análise antiga
function invalidarAnalise() {
    estado.versao++;
    estado.jsonAnalisado = null;
    estado.salvo = false;

    const resultado = $("resultado-analise-nf");

    if (resultado) {
        resultado.replaceChildren();
        resultado.hidden = true;
    }

    mostrarMensagem("");
    atualizarBotoes();
}

// Cria uma linha de resultado
function criarResultado(titulo, dados) {
    const item = document.createElement("div");
    item.className = "linha-analise-nf";

    const nome = document.createElement("strong");
    nome.textContent = titulo;

    const situacao = document.createElement("span");

    if (dados.existe) {
        situacao.textContent = `Cadastrado — ID ${dados.id}`;
        situacao.className = "situacao-existente";
    } else {
        situacao.textContent = "Não cadastrado";
        situacao.className = "situacao-ausente";
    }

    const descricao = document.createElement("small");

    descricao.textContent =
        dados.razaoSocial ||
        dados.nomeCompleto ||
        dados.nome ||
        dados.descricao ||
        "";

    item.append(nome, situacao, descricao);

    return item;
}

// Mostra os cadastros consultados
function exibirAnalise(analise) {
    const resultado = $("resultado-analise-nf");

    resultado.replaceChildren(
        criarResultado("Fornecedor", analise.fornecedor),
        criarResultado("Faturado", analise.faturado),
        criarResultado("Classificação", analise.despesa)
    );

    const resumo = document.createElement("p");
    resumo.className = "resumo-analise-nf";

    resumo.textContent =
        `${analise.resumo.cadastrosExistentes} cadastrado(s) ` +
        `e ${analise.resumo.cadastrosNaoEncontrados} ` +
        `não encontrado(s).`;

    resultado.appendChild(resumo);
    resultado.hidden = false;
}

// Executa o primeiro agente: análise
async function analisarNota() {
    if (estado.analisando || estado.salvando || estado.salvo) {
        return;
    }

    let dados;

    try {
        dados = obterJSON();
        validarNota(dados);
    } catch (erro) {
        invalidarAnalise();
        mostrarMensagem(erro.message, "erro");
        return;
    }

    const versao = estado.versao;
    const texto = lerTextoJSON();

    estado.jsonAnalisado = null;
    estado.analisando = true;

    atualizarBotoes();
    mostrarMensagem("Analisando dados...", "");

    try {
        const resposta = await requisicao(
            "/api/contas/analisar",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            }
        );

        if (
            versao !== estado.versao ||
            texto !== lerTextoJSON()
        ) {
            return;
        }

        const analise = resposta.analise;

        if (
            !analise?.fornecedor ||
            !analise?.faturado ||
            !analise?.despesa ||
            !analise?.resumo
        ) {
            throw new Error(
                "A resposta da análise está incompleta."
            );
        }

        estado.jsonAnalisado = {
            dados,
            texto
        };

        exibirAnalise(analise);

        mostrarMensagem(
            "Análise realizada com sucesso!",
            "sucesso"
        );

        // Mostra automaticamente o resultado da análise
$("mensagem-analise-nf").scrollIntoView({
    behavior: "smooth",
    block: "center"
});

    } catch (erro) {
        if (versao === estado.versao) {
            estado.jsonAnalisado = null;
            $("resultado-analise-nf").hidden = true;
            mostrarMensagem(erro.message, "erro");
        }

    } finally {
        estado.analisando = false;
        atualizarBotoes();
    }
}

// Executa o segundo agente: persistência
async function salvarNota() {
    if (
        estado.analisando ||
        estado.salvando ||
        estado.salvo ||
        !estado.jsonAnalisado
    ) {
        return;
    }

    const anterior = estado.jsonAnalisado;

    if (lerTextoJSON() !== anterior.texto) {
        invalidarAnalise();

        mostrarMensagem(
            "O JSON mudou. Realize a análise novamente.",
            "erro"
        );
        return;
    }

    estado.salvando = true;

    atualizarBotoes();
    mostrarMensagem("Salvando no banco...");

    try {
        const resposta = await requisicao(
            "/api/contas",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(anterior.dados)
            }
        );

        estado.salvo = true;
        estado.jsonAnalisado = null;

        mostrarMensagem(
            resposta.mensagem ||
            "Conta a pagar salva com sucesso!",
            "sucesso"
        );

    } catch (erro) {
        mostrarMensagem(erro.message, "erro");

    } finally {
        estado.salvando = false;
        atualizarBotoes();
    }
}

// Encontra o card que contém a saída JSON
function encontrarCardJSON(saida) {
    const tela = $("tela-extracao");

    const card = saida.closest(
        ".card, .cartao, .cartao-sistema, " +
        ".card-extracao, .resultado-card, " +
        ".dados-extraidos"
    );

    if (card && tela?.contains(card)) {
        return card;
    }

    // Alternativa: encontra o bloco principal da tela
    let elemento = saida;

    while (
        elemento.parentElement &&
        elemento.parentElement !== tela
    ) {
        elemento = elemento.parentElement;
    }

    return elemento;
}

// Cria os botões FORA da área JSON
function criarPainel() {
    const saida = $("json-output");

    const painel = document.createElement("div");
    painel.id = "painel-analise-nf";
    painel.className = "painel-analise-nf";

    painel.innerHTML = `
        <div class="botoes-analise-nf">
            <button
                id="btn-analisar-nf"
                type="button"
                class="botao-secundario"
                disabled
            >
                Analisar dados
            </button>

            <button
                id="btn-salvar-nf"
                type="button"
                class="botao-acao"
                disabled
            >
                Salvar no banco
            </button>
        </div>

        <p
            id="mensagem-analise-nf"
            class="mensagem-analise-nf"
            role="status"
            hidden
        ></p>

        <div
            id="resultado-analise-nf"
            class="resultado-analise-nf"
            hidden
        ></div>
    `;

    // Coloca o painel DEPOIS do card, não dentro do JSON
    const card = encontrarCardJSON(saida);

    card.insertAdjacentElement("afterend", painel);

    $("btn-analisar-nf").addEventListener(
        "click",
        analisarNota
    );

    $("btn-salvar-nf").addEventListener(
        "click",
        salvarNota
    );
}

// Inicializa a análise
export function configurarAnaliseNF() {
    const saida = $("json-output");

    if (!saida || $("painel-analise-nf")) {
        return;
    }

    criarPainel();

    // Nova extração exige nova análise
    $("btn-extract")?.addEventListener(
        "click",
        invalidarAnalise,
        true
    );

    // Edição manual invalida análise
    saida.addEventListener("input", invalidarAnalise);

    // Detecta alterações feitas pelo extrator
    const observador = new MutationObserver(() => {
        invalidarAnalise();
    });

    observador.observe(saida, {
        childList: true,
        subtree: true,
        characterData: true
    });

    invalidarAnalise();
}
