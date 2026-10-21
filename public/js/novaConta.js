
import { requisicao } from "./api.js";

const $ = (id) => document.getElementById(id);

let areaLista = null;
let areaNovaConta = null;
let carregando = false;
let salvando = false;

// Busca todas as páginas de uma API
async function buscarTodos(caminho, nomeColecao, filtros = {}) {
    const registros = [];
    let pagina = 1;

    while (true) {
        const parametros = new URLSearchParams({
            ...filtros,
            pagina: String(pagina),
            limite: "100"
        });

        const dados = await requisicao(
            `${caminho}?${parametros.toString()}`
        );

        const itens = dados[nomeColecao];

        if (!Array.isArray(itens)) {
            throw new Error(
                `Resposta inválida ao carregar ${nomeColecao}.`
            );
        }

        registros.push(...itens);

        const totalPaginas = Number(dados.totalPaginas);

        if (
            !Number.isSafeInteger(totalPaginas) ||
            totalPaginas < 0
        ) {
            throw new Error('Paginação inválida no servidor.');
        }

        if (pagina >= totalPaginas) {
            break;
        }

        pagina++;
    }

    return registros;
}

// Preenche um campo de seleção
function preencherSelecao(id, itens, campoNome, textoVazio) {
    const select = $(id);

    select.replaceChildren();

    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = textoVazio;

    select.appendChild(inicial);

    itens.forEach((item) => {
        const opcao = document.createElement("option");

        opcao.value = String(item.id);
        opcao.textContent = item[campoNome] || `ID ${item.id}`;

        select.appendChild(opcao);
    });

    select.value = "";
}

// Mostra avisos no formulário
function mostrarMensagem(texto, erro = false) {
    const elemento = $("mensagem-nova-conta");

    elemento.textContent = texto;
    elemento.className = erro
        ? "mensagem-conta erro"
        : "mensagem-conta";
}

// Habilita ou desabilita o formulário
function definirCarregamento(valor) {
    carregando = valor;
    atualizarBotaoSalvar();
}

// Atualiza a disponibilidade do botão Salvar
function atualizarBotaoSalvar() {
    const formulario = $("form-nova-conta");

    const camposProntos = [
        "nova-fornecedor",
        "nova-faturado",
        "nova-classificacao"
    ].every((id) => $(id).options.length > 1);

    $("btn-salvar-nova-conta").disabled =
        carregando || salvando || !camposProntos;

    $("btn-salvar-nova-conta").textContent =
        salvando ? "Salvando..." : "Salvar conta";

    if (formulario) {
        formulario.setAttribute(
            "aria-busy",
            String(carregando || salvando)
        );
    }
}

// Carrega fornecedores, faturados e despesas
async function carregarCadastros() {
    if (carregando) return;

    definirCarregamento(true);
    mostrarMensagem("Carregando cadastros ativos...");

    try {
        const [fornecedores, faturados, classificacoes] =
            await Promise.all([
                buscarTodos(
                    "/api/pessoas",
                    "pessoas",
                    { tipo: "FORNECEDOR" }
                ),
                buscarTodos(
                    "/api/pessoas",
                    "pessoas",
                    { tipo: "FATURADO" }
                ),
                buscarTodos(
                    "/api/classificacoes",
                    "classificacoes",
                    { tipo: "DESPESA" }
                )
            ]);

        preencherSelecao(
            "nova-fornecedor",
            fornecedores,
            "razaosocial",
            "Selecione um fornecedor"
        );

        preencherSelecao(
            "nova-faturado",
            faturados,
            "razaosocial",
            "Selecione o faturado"
        );

        preencherSelecao(
            "nova-classificacao",
            classificacoes,
            "descricao",
            "Selecione uma classificação"
        );

        if (
            !fornecedores.length ||
            !faturados.length ||
            !classificacoes.length
        ) {
            mostrarMensagem(
                "É necessário ter fornecedor, faturado e " +
                "classificação de despesa ativos antes de salvar.",
                true
            );
        } else {
            mostrarMensagem(
                "Selecione os cadastros e informe os dados da conta."
            );
        }

    } catch (erro) {
        mostrarMensagem(erro.message, true);

        // Impede salvar com opções incompletas
        [
            "nova-fornecedor",
            "nova-faturado",
            "nova-classificacao"
        ].forEach((id) => $(id).replaceChildren());

    } finally {
        definirCarregamento(false);
    }
}

// Exibe a tela de inclusão
async function abrirNovaConta() {
    if (salvando) return;

    $("form-nova-conta").reset();

    areaLista.hidden = true;
    areaNovaConta.hidden = false;

    // Atualiza as opções sempre que abrir
    await carregarCadastros();
}

// Retorna à consulta
function voltarParaLista() {
    if (salvando) return;

    areaNovaConta.hidden = true;
    areaLista.hidden = false;
}

// Valida a data informada
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

// Salva a nova conta
async function salvarNovaConta(evento) {
    evento.preventDefault();

    if (carregando || salvando) return;

    const valor = Number($("nova-valor").value);

    const dados = {
        fornecedorId: $("nova-fornecedor").value,
        faturadoId: $("nova-faturado").value,
        classificacaoId: $("nova-classificacao").value,
        descricao: $("nova-descricao").value.trim(),
        valorTotal: valor,
        dataEmissao: $("nova-emissao").value,
        dataVencimento: $("nova-vencimento").value
    };

    if (
        !dados.fornecedorId ||
        !dados.faturadoId ||
        !dados.classificacaoId
    ) {
        mostrarMensagem(
            "Selecione fornecedor, faturado e classificação.",
            true
        );
        return;
    }

    if (
        !Number.isFinite(valor) ||
        valor <= 0 ||
        valor > 9999999999.99 ||
        Math.abs(valor * 100 - Math.round(valor * 100)) >
            0.000001
    ) {
        mostrarMensagem("Informe um valor válido.", true);
        return;
    }

    if (
        !dataValida(dados.dataEmissao) ||
        !dataValida(dados.dataVencimento)
    ) {
        mostrarMensagem("Informe datas válidas.", true);
        return;
    }

    if (dados.dataVencimento < dados.dataEmissao) {
        mostrarMensagem(
            "O vencimento não pode ser anterior à emissão.",
            true
        );
        return;
    }

    salvando = true;
    atualizarBotaoSalvar();
    mostrarMensagem("Salvando conta...");

    try {
        const resposta = await requisicao(
            "/api/contas/manual",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            }
        );

        // Volta para a listagem
        areaNovaConta.hidden = true;
        areaLista.hidden = false;

        // Atualiza a consulta com todos os ativos
        $("btn-todas-contas").click();

        const aviso = $("aviso-contas");

        if (aviso) {
            aviso.textContent =
                resposta.mensagem ||
                "Conta cadastrada com sucesso!";

            aviso.className = "aviso-contas sucesso";
            aviso.hidden = false;
        }

        $("form-nova-conta").reset();

    } catch (erro) {
        mostrarMensagem(erro.message, true);

    } finally {
        salvando = false;
        atualizarBotaoSalvar();
    }
}

// Cria a tela de inclusão
function criarFormulario() {
    areaNovaConta = document.createElement("div");

    areaNovaConta.id = "area-nova-conta";
    areaNovaConta.className = "cartao-sistema";
    areaNovaConta.hidden = true;

    areaNovaConta.innerHTML = `
        <h2>Nova Conta a Pagar</h2>

        <form id="form-nova-conta" class="form-conta">
            <div class="grade-form-conta">

                <label>
                    Fornecedor
                    <select id="nova-fornecedor" required>
                        <option value="">
                            Carregando fornecedores...
                        </option>
                    </select>
                </label>

                <label>
                    Faturado
                    <select id="nova-faturado" required>
                        <option value="">
                            Carregando faturados...
                        </option>
                    </select>
                </label>

                <label class="campo-largo">
                    Classificação da despesa
                    <select id="nova-classificacao" required>
                        <option value="">
                            Carregando classificações...
                        </option>
                    </select>
                </label>

                <label class="campo-largo">
                    Descrição
                    <input
                        id="nova-descricao"
                        type="text"
                        maxlength="200"
                        placeholder="Descreva a despesa"
                        required
                    >
                </label>

                <label>
                    Valor total (R$)
                    <input
                        id="nova-valor"
                        type="number"
                        min="0.01"
                        max="9999999999.99"
                        step="0.01"
                        required
                    >
                </label>

                <label>
                    Data de emissão
                    <input
                        id="nova-emissao"
                        type="date"
                        required
                    >
                </label>

                <label>
                    Data de vencimento
                    <input
                        id="nova-vencimento"
                        type="date"
                        required
                    >
                </label>

            </div>

            <p
                id="mensagem-nova-conta"
                class="mensagem-conta"
                role="status"
            ></p>

            <div class="acoes-form-conta">
                <button
                    id="btn-cancelar-nova-conta"
                    type="button"
                    class="botao-secundario"
                >
                    Cancelar
                </button>

                <button
                    id="btn-salvar-nova-conta"
                    type="submit"
                    class="botao-acao"
                    disabled
                >
                    Salvar conta
                </button>
            </div>
        </form>
    `;

    $("tela-contas").appendChild(areaNovaConta);

    $("btn-cancelar-nova-conta").addEventListener(
        "click",
        voltarParaLista
    );

    $("form-nova-conta").addEventListener(
        "submit",
        salvarNovaConta
    );
}

// Cria o botão Nova Conta
function criarBotaoNovaConta() {
    if ($("btn-nova-conta")) return;

    const botao = document.createElement("button");

    botao.id = "btn-nova-conta";
    botao.type = "button";
    botao.className = "botao-acao";
    botao.textContent = "Nova Conta";

    const barra = $("busca-contas").closest(".barra-consulta");

    barra.appendChild(botao);

    botao.addEventListener("click", abrirNovaConta);
}

// Inicializa a inclusão manual
export function configurarNovaConta() {
    const corpo = $("tabela-contas");

    if (!corpo || $("area-nova-conta")) return;

    areaLista = corpo.closest(".cartao-sistema");

    if (!areaLista) {
        console.error(
            "Área de consulta de contas não encontrada."
        );
        return;
    }

    criarFormulario();
    criarBotaoNovaConta();
}
