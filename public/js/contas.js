
import { requisicao } from "./api.js";

const $ = (id) => document.getElementById(id);

// Estado da consulta
const estado = {
    pagina: 1,
    limite: 10,
    totalPaginas: 0,
    ordenarPor: "id",
    direcao: "asc",
    busca: "",
    fornecedorId: "",
    classificacaoId: "",
    consultou: false,
    carregando: false
};

let areaLista = null;
let areaEdicao = null;

// Formata valores monetários
function formatarMoeda(valor) {
    if (valor == null) return "—";

    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "—";

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(numero);
}

// Formata datas
function formatarData(valor) {
    if (!valor) return "—";

    const data = String(valor).slice(0, 10);
    const partes = data.split("-");

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Adiciona células de texto
function adicionarCelula(linha, valor) {
    const celula = document.createElement("td");
    celula.textContent = valor ?? "—";
    linha.appendChild(celula);

    return celula;
}

// Exibe mensagens na tabela
function mostrarMensagem(texto) {
    const corpo = $("tabela-contas");
    corpo.replaceChildren();

    const linha = document.createElement("tr");
    const celula = document.createElement("td");

    celula.colSpan = 6;
    celula.className = "tabela-vazia";
    celula.textContent = texto;

    linha.appendChild(celula);
    corpo.appendChild(linha);
}

// Cria uma área de avisos
function criarAvisos() {
    if ($("aviso-contas")) return;

    const aviso = document.createElement("p");
    aviso.id = "aviso-contas";
    aviso.setAttribute("role", "status");
    aviso.hidden = true;

    areaLista.insertBefore(aviso, areaLista.firstChild);
}

// Exibe o resultado das operações
function mostrarAviso(texto, erro = false) {
    const aviso = $("aviso-contas");

    aviso.textContent = texto;
    aviso.className = erro
        ? "aviso-contas erro"
        : "aviso-contas sucesso";

    aviso.hidden = false;
}

// Cria os filtros adicionais
function criarFiltros() {
    const barra = $("busca-contas").closest(".barra-consulta");

    if ($("filtros-contas")) return;

    const filtros = document.createElement("div");
    filtros.id = "filtros-contas";
    filtros.className = "filtros-contas";

    const fornecedor = document.createElement("input");
    fornecedor.id = "filtro-fornecedor-id";
    fornecedor.type = "number";
    fornecedor.min = "1";
    fornecedor.step = "1";
    fornecedor.placeholder = "ID do fornecedor";

    const classificacao = document.createElement("input");
    classificacao.id = "filtro-classificacao-id";
    classificacao.type = "number";
    classificacao.min = "1";
    classificacao.step = "1";
    classificacao.placeholder = "ID da classificação";

    filtros.append(fornecedor, classificacao);
    barra.insertAdjacentElement("afterend", filtros);
}

// Cria os controles de paginação
function criarPaginacao() {
    if ($("paginacao-contas")) return;

    const tabela = $("tabela-contas").closest(
        ".tabela-container"
    );

    const paginacao = document.createElement("div");
    paginacao.id = "paginacao-contas";
    paginacao.className = "paginacao-contas";

    const anterior = document.createElement("button");
    anterior.id = "contas-anterior";
    anterior.type = "button";
    anterior.className = "botao-secundario";
    anterior.textContent = "Anterior";
    anterior.disabled = true;

    const informacao = document.createElement("span");
    informacao.id = "contas-info-pagina";
    informacao.textContent = "Nenhuma consulta realizada";

    const proxima = document.createElement("button");
    proxima.id = "contas-proxima";
    proxima.type = "button";
    proxima.className = "botao-secundario";
    proxima.textContent = "Próxima";
    proxima.disabled = true;

    paginacao.append(anterior, informacao, proxima);
    tabela.insertAdjacentElement("afterend", paginacao);

    // Página anterior
    anterior.addEventListener("click", () => {
        if (estado.carregando || estado.pagina <= 1) return;

        estado.pagina--;
        consultarContas();
    });

    // Próxima página
    proxima.addEventListener("click", () => {
        if (
            estado.carregando ||
            estado.pagina >= estado.totalPaginas
        ) return;

        estado.pagina++;
        consultarContas();
    });
}

// Lê os filtros
function lerFiltros() {
    estado.busca = $("busca-contas").value.trim();
    estado.fornecedorId =
        $("filtro-fornecedor-id").value.trim();
    estado.classificacaoId =
        $("filtro-classificacao-id").value.trim();
}

// Monta os parâmetros da consulta
function montarParametros() {
    const parametros = new URLSearchParams({
        pagina: String(estado.pagina),
        limite: String(estado.limite),
        ordenarPor: estado.ordenarPor,
        direcao: estado.direcao
    });

    if (estado.busca) {
        parametros.set("busca", estado.busca);
    }

    if (estado.fornecedorId) {
        parametros.set("fornecedorId", estado.fornecedorId);
    }

    if (estado.classificacaoId) {
        parametros.set(
            "classificacaoId",
            estado.classificacaoId
        );
    }

    return parametros;
}

// Atualiza a paginação
function atualizarPaginacao(dados) {
    estado.pagina = Number(dados.pagina) || 1;
    estado.totalPaginas = Number(dados.totalPaginas) || 0;

    $("contas-info-pagina").textContent =
        `Página ${estado.pagina} de ${estado.totalPaginas} | ` +
        `${Number(dados.total) || 0} registro(s)`;
}

// Controla o carregamento
function definirCarregamento(carregando) {
    estado.carregando = carregando;

    $("btn-buscar-contas").disabled = carregando;
    $("btn-todas-contas").disabled = carregando;

    $("contas-anterior").disabled =
        carregando || estado.pagina <= 1;

    $("contas-proxima").disabled =
        carregando ||
        estado.totalPaginas === 0 ||
        estado.pagina >= estado.totalPaginas;
}

// Cria o botão de ação
function criarBotao(texto, classe, acao) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.textContent = texto;
    botao.className = classe;

    botao.addEventListener("click", acao);

    return botao;
}

// Preenche a tabela
function preencherTabela(contas) {
    const corpo = $("tabela-contas");
    corpo.replaceChildren();

    if (!contas.length) {
        mostrarMensagem("Nenhuma conta encontrada.");
        return;
    }

    contas.forEach((conta) => {
        const linha = document.createElement("tr");

        adicionarCelula(linha, conta.id);
        adicionarCelula(linha, conta.fornecedor || "—");
        adicionarCelula(linha, conta.descricao || "—");
        adicionarCelula(
            linha,
            formatarMoeda(conta.valortotal)
        );
        adicionarCelula(
            linha,
            formatarData(conta.datavencimento)
        );

        // Botões Editar e Excluir
        const celulaAcoes = document.createElement("td");
        celulaAcoes.className = "acoes-tabela";

        const editar = criarBotao(
            "Editar",
            "botao-secundario",
            () => abrirEdicao(conta.id)
        );

        const excluir = criarBotao(
            "Excluir",
            "botao-excluir",
            () => excluirConta(conta.id)
        );

        celulaAcoes.append(editar, excluir);
        linha.appendChild(celulaAcoes);

        corpo.appendChild(linha);
    });
}

// Consulta as contas
async function consultarContas() {
    if (estado.carregando) return;

    definirCarregamento(true);
    mostrarMensagem("Consultando contas...");

    try {
        const parametros = montarParametros();

        const dados = await requisicao(
            `/api/contas?${parametros.toString()}`
        );

        estado.consultou = true;

        preencherTabela(dados.contas || []);
        atualizarPaginacao(dados);

    } catch (erro) {
        console.error("Erro ao consultar contas:", erro);
        mostrarMensagem(erro.message);

        $("contas-info-pagina").textContent =
            "Não foi possível concluir a consulta.";

    } finally {
        definirCarregamento(false);
    }
}

// Cria o formulário separado de edição
function criarFormularioEdicao() {
    if ($("form-editar-conta")) return;

    areaEdicao = document.createElement("div");
    areaEdicao.className = "cartao-sistema";
    areaEdicao.id = "area-edicao-conta";
    areaEdicao.hidden = true;

    areaEdicao.innerHTML = `
        <h2 id="titulo-edicao-conta">Editar conta</h2>

        <form id="form-editar-conta" class="form-conta">

            <input type="hidden" id="editar-conta-id">

            <div class="grade-form-conta">

                <label>
                    ID do fornecedor
                    <input
                        id="editar-fornecedor"
                        type="number"
                        min="1"
                        step="1"
                        required
                    >
                </label>

                <label>
                    ID do faturado
                    <input
                        id="editar-faturado"
                        type="number"
                        min="1"
                        step="1"
                        required
                    >
                </label>

                <label>
                    ID da classificação
                    <input
                        id="editar-classificacao"
                        type="number"
                        min="1"
                        step="1"
                        required
                    >
                </label>

                <label>
                    Valor total (R$)
                    <input
                        id="editar-valor"
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
                        id="editar-emissao"
                        type="date"
                        required
                    >
                </label>

                <label>
                    Data de vencimento
                    <input
                        id="editar-vencimento"
                        type="date"
                        required
                    >
                </label>

                <label class="campo-largo">
                    Descrição
                    <input
                        id="editar-descricao"
                        type="text"
                        maxlength="200"
                    >
                </label>

            </div>

            <p id="mensagem-edicao" role="status"></p>

            <div class="acoes-form-conta">
                <button
                    id="btn-cancelar-edicao"
                    type="button"
                    class="botao-secundario"
                >
                    Cancelar
                </button>

                <button
                    id="btn-salvar-edicao"
                    type="submit"
                    class="botao-acao"
                >
                    Salvar alterações
                </button>
            </div>

        </form>
    `;

    $("tela-contas").appendChild(areaEdicao);

    // Cancela a edição
    $("btn-cancelar-edicao").addEventListener(
        "click",
        voltarParaLista
    );

    // Salva a edição
    $("form-editar-conta").addEventListener(
        "submit",
        salvarEdicao
    );
}

// Volta para a consulta
function voltarParaLista() {
    areaEdicao.hidden = true;
    areaLista.hidden = false;
}

// Abre a edição da conta
async function abrirEdicao(id) {
    try {
        const dados = await requisicao(`/api/contas/${id}`);
        const conta = dados.conta;

        if (!conta) {
            throw new Error("Conta não encontrada.");
        }

        $("editar-conta-id").value = conta.id;
        $("editar-fornecedor").value = conta.fornecedorid;
        $("editar-faturado").value = conta.faturadoid;
        $("editar-classificacao").value = conta.classificacaoid;
        $("editar-descricao").value = conta.descricao || "";
        $("editar-valor").value = conta.valortotal;
        $("editar-emissao").value =
            String(conta.dataemissao || "").slice(0, 10);
        $("editar-vencimento").value =
            String(conta.datavencimento || "").slice(0, 10);

        $("titulo-edicao-conta").textContent =
            `Editar conta #${conta.id}`;

        $("mensagem-edicao").textContent = "";

        // Exibe somente o formulário
        areaLista.hidden = true;
        areaEdicao.hidden = false;

        $("editar-fornecedor").focus();

    } catch (erro) {
        mostrarAviso(erro.message, true);
    }
}

// Salva as alterações
async function salvarEdicao(evento) {
    evento.preventDefault();

    const id = $("editar-conta-id").value;
    const botao = $("btn-salvar-edicao");
    const mensagem = $("mensagem-edicao");

    const dados = {
        fornecedorId: $("editar-fornecedor").value.trim(),
        faturadoId: $("editar-faturado").value.trim(),
        classificacaoId: $("editar-classificacao").value.trim(),
        descricao: $("editar-descricao").value.trim(),
        valorTotal: Number($("editar-valor").value),
        dataEmissao: $("editar-emissao").value,
        dataVencimento: $("editar-vencimento").value
    };

    // Valida o vencimento
    if (dados.dataVencimento < dados.dataEmissao) {
        mensagem.textContent =
            "O vencimento não pode ser anterior à emissão.";
        return;
    }

    botao.disabled = true;
    mensagem.textContent = "Salvando alterações...";

    try {
        await requisicao(`/api/contas/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        voltarParaLista();

        await consultarContas();

        mostrarAviso("Conta atualizada com sucesso.");

    } catch (erro) {
        mensagem.textContent = erro.message;

    } finally {
        botao.disabled = false;
    }
}

// Exclui logicamente a conta
async function excluirConta(id) {
    const confirmado = window.confirm(
        `Deseja excluir a conta #${id}?\n\n` +
        "O registro será inativado no banco de dados."
    );

    if (!confirmado) return;

    try {
        await requisicao(`/api/contas/${id}`, {
            method: "DELETE"
        });

        // Atualiza a listagem
        await consultarContas();

        mostrarAviso("Conta excluída com sucesso.");

    } catch (erro) {
        mostrarAviso(erro.message, true);
    }
}

// Configura a ordenação
function configurarOrdenacao() {
    const colunas = {
        0: "id",
        1: "fornecedor",
        3: "valor",
        4: "vencimento"
    };

    const cabecalhos = document.querySelectorAll(
        "#tela-contas .tabela-sistema thead th"
    );

    cabecalhos.forEach((cabecalho, indice) => {
        const coluna = colunas[indice];

        if (!coluna) return;

        cabecalho.tabIndex = 0;
        cabecalho.setAttribute("role", "button");
        cabecalho.title = "Clique para ordenar";

        const ordenar = () => {
            if (!estado.consultou || estado.carregando) return;

            if (estado.ordenarPor === coluna) {
                estado.direcao =
                    estado.direcao === "asc" ? "desc" : "asc";
            } else {
                estado.ordenarPor = coluna;
                estado.direcao = "asc";
            }

            estado.pagina = 1;
            consultarContas();
        };

        cabecalho.addEventListener("click", ordenar);

        cabecalho.addEventListener("keydown", (evento) => {
            if (
                evento.key === "Enter" ||
                evento.key === " "
            ) {
                evento.preventDefault();
                ordenar();
            }
        });
    });
}

// Inicializa o módulo
export function configurarContas() {
    const corpo = $("tabela-contas");

    if (!corpo) return;

    // Localiza a área de consulta
    areaLista = corpo.closest(".cartao-sistema");

    criarAvisos();
    criarFiltros();
    criarPaginacao();
    criarFormularioEdicao();
    configurarOrdenacao();

    // Busca com filtros
    $("btn-buscar-contas").addEventListener(
        "click",
        () => {
            lerFiltros();
            estado.pagina = 1;
            consultarContas();
        }
    );

    // Mostra todos os ativos
    $("btn-todas-contas").addEventListener(
        "click",
        () => {
            $("busca-contas").value = "";
            $("filtro-fornecedor-id").value = "";
            $("filtro-classificacao-id").value = "";

            lerFiltros();
            estado.pagina = 1;
            consultarContas();
        }
    );

    // Busca com Enter
    $("busca-contas").addEventListener(
        "keydown",
        (evento) => {
            if (evento.key !== "Enter") return;

            evento.preventDefault();
            lerFiltros();
            estado.pagina = 1;
            consultarContas();
        }
    );

    mostrarMensagem("Use Buscar ou Todos para consultar.");
}
