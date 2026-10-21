
import { requisicao } from "./api.js";

const API = "/api/classificacoes";

// Estado da consulta
const estado = {
    pagina: 1,
    limite: 10,
    totalPaginas: 0,
    busca: "",
    tipo: "",
    ordenarPor: "id",
    direcao: "ASC",
    consultou: false,
    carregando: false
};

// Cria elementos com texto seguro
function elemento(tag, texto = "", classe = "") {
    const item = document.createElement(tag);

    if (texto !== "") {
        item.textContent = String(texto);
    }

    if (classe) {
        item.className = classe;
    }

    return item;
}

// Exibe mensagens
function mostrarMensagem(texto, erro = false) {
    const mensagem = document.getElementById("mensagem-classificacoes");

    if (!mensagem) return;

    mensagem.textContent = texto;
    mensagem.style.color = erro ? "#b42318" : "#008037";
}

// Alterna entre consulta e formulário
function mostrarVisualizacao(nome) {
    document.getElementById("classificacoes-consulta").hidden =
        nome !== "consulta";

    document.getElementById("classificacoes-cadastro").hidden =
        nome !== "cadastro";

    mostrarMensagem("");
}

// Exibe uma mensagem na tabela
function tabelaVazia(texto) {
    const corpo = document.getElementById("tabela-classificacoes");
    corpo.replaceChildren();

    const linha = elemento("tr");
    const coluna = elemento("td", texto, "tabela-vazia");

    coluna.colSpan = 4;
    linha.appendChild(coluna);
    corpo.appendChild(linha);
}

// Configura ordenação das colunas
function configurarOrdenacao() {
    const colunas = [
        ["id", "ID"],
        ["tipo", "Tipo"],
        ["descricao", "Descrição"]
    ];

    const cabecalho = document.querySelector(
        "#classificacoes-consulta .tabela-sistema thead tr"
    );

    cabecalho.replaceChildren();

    for (const [campo, titulo] of colunas) {
        const th = elemento("th");
        const botao = elemento("button", titulo, "botao-ordenacao");

        botao.type = "button";
        botao.dataset.campo = campo;
        botao.style.background = "transparent";
        botao.style.border = "none";
        botao.style.color = "inherit";
        botao.style.font = "inherit";
        botao.style.cursor = "pointer";

        botao.addEventListener("click", () => {
            if (!estado.consultou || estado.carregando) return;

            if (estado.ordenarPor === campo) {
                estado.direcao =
                    estado.direcao === "ASC" ? "DESC" : "ASC";
            } else {
                estado.ordenarPor = campo;
                estado.direcao = "ASC";
            }

            estado.pagina = 1;
            atualizarCabecalho();
            consultarClassificacoes();
        });

        th.appendChild(botao);
        cabecalho.appendChild(th);
    }

    cabecalho.appendChild(elemento("th", "Ações"));
    atualizarCabecalho();
}

// Atualiza indicadores da ordenação
function atualizarCabecalho() {
    const titulos = {
        id: "ID",
        tipo: "Tipo",
        descricao: "Descrição"
    };

    document.querySelectorAll(
        "#classificacoes-consulta .botao-ordenacao"
    ).forEach((botao) => {
        const ativo = botao.dataset.campo === estado.ordenarPor;

        botao.textContent = titulos[botao.dataset.campo] + (
            ativo ? ` ${estado.direcao === "ASC" ? "↑" : "↓"}` : ""
        );
    });
}

// Desenha os registros encontrados
function desenharTabela(classificacoes) {
    const corpo = document.getElementById("tabela-classificacoes");
    corpo.replaceChildren();

    if (!classificacoes.length) {
        tabelaVazia("Nenhuma classificação ativa encontrada.");
        return;
    }

    for (const classificacao of classificacoes) {
        const linha = elemento("tr");

        for (const valor of [
            classificacao.id,
            classificacao.tipo,
            classificacao.descricao
        ]) {
            linha.appendChild(elemento("td", valor ?? "-"));
        }

        const acoes = elemento("td");
        const editar = elemento("button", "Editar", "botao-secundario");
        const excluir = elemento("button", "Excluir", "botao-secundario");

        editar.type = "button";
        excluir.type = "button";

        editar.addEventListener("click", () => {
            abrirFormulario(classificacao.id);
        });

        excluir.addEventListener("click", () => {
            excluirClassificacao(
                classificacao.id,
                classificacao.descricao
            );
        });

        acoes.append(editar, " ", excluir);
        linha.appendChild(acoes);
        corpo.appendChild(linha);
    }
}

// Atualiza a paginação
function atualizarPaginacao(total, pagina, totalPaginas) {
    document.getElementById("classificacoes-info-pagina").textContent =
        `Página ${pagina} de ${Math.max(totalPaginas, 1)} — ${total} registro(s)`;

    document.getElementById("classificacoes-pagina-anterior").disabled =
        estado.carregando || pagina <= 1;

    document.getElementById("classificacoes-proxima-pagina").disabled =
        estado.carregando || pagina >= totalPaginas;
}

// Consulta registros com filtros combinados
async function consultarClassificacoes() {
    if (estado.carregando) return;

    estado.carregando = true;
    tabelaVazia("Carregando classificações...");

    const parametros = new URLSearchParams({
        pagina: String(estado.pagina),
        limite: String(estado.limite),
        ordenarPor: estado.ordenarPor,
        direcao: estado.direcao
    });

    if (estado.busca) {
        parametros.set("busca", estado.busca);
    }

    if (estado.tipo) {
        parametros.set("tipo", estado.tipo);
    }

    try {
        const resultado = await requisicao(
            `${API}?${parametros.toString()}`
        );

        estado.totalPaginas = resultado.totalPaginas || 0;

        desenharTabela(resultado.classificacoes || []);

        atualizarPaginacao(
            resultado.total || 0,
            resultado.pagina || estado.pagina,
            estado.totalPaginas
        );
    } catch (erro) {
        tabelaVazia("Não foi possível consultar classificações.");
        mostrarMensagem(erro.message, true);
    } finally {
        estado.carregando = false;
    }
}

// Abre o formulário
async function abrirFormulario(id = null) {
    const formulario = document.getElementById("form-classificacoes");

    formulario.reset();

    document.getElementById("classificacao-id").value = "";
    document.getElementById("titulo-form-classificacoes").textContent =
        id ? "Editar classificação" : "Cadastrar classificação";

    mostrarVisualizacao("cadastro");

    if (!id) return;

    try {
        const resultado = await requisicao(`${API}/${id}`);
        const classificacao = resultado.classificacao;

        document.getElementById("classificacao-id").value =
            classificacao.id;

        document.getElementById("classificacao-tipo").value =
            classificacao.tipo;

        document.getElementById("classificacao-descricao").value =
            classificacao.descricao;
    } catch (erro) {
        mostrarVisualizacao("consulta");
        mostrarMensagem(erro.message, true);
    }
}

// Salva cadastro ou edição
async function salvarClassificacao(evento) {
    evento.preventDefault();

    const formulario = document.getElementById("form-classificacoes");
    const id = document.getElementById("classificacao-id").value;
    const salvar = document.getElementById("btn-salvar-classificacao");

    const dados = {
        tipo: document.getElementById("classificacao-tipo").value,
        descricao: document.getElementById(
            "classificacao-descricao"
        ).value.trim()
    };

    if (!dados.tipo || !dados.descricao) {
        window.alert("Preencha todos os campos.");
        return;
    }

    salvar.disabled = true;

    try {
        const resultado = await requisicao(
            id ? `${API}/${id}` : API,
            {
                method: id ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            }
        );

        formulario.reset();
        mostrarVisualizacao("consulta");

        if (estado.consultou) {
            estado.pagina = 1;
            await consultarClassificacoes();
        } else {
            tabelaVazia("Use Buscar ou Todos para consultar.");
        }

        mostrarMensagem(
            resultado.mensagem ||
            "Classificação salva com sucesso!"
        );
    } catch (erro) {
        window.alert(erro.message);
    } finally {
        salvar.disabled = false;
    }
}

// Exclui logicamente
async function excluirClassificacao(id, descricao) {
    const confirmado = window.confirm(
        `Deseja excluir a classificação "${descricao}"?\n\n` +
        "O registro ficará inativo e não poderá ser reativado por esta tela."
    );

    if (!confirmado) return;

    try {
        const resultado = await requisicao(`${API}/${id}`, {
            method: "DELETE"
        });

        estado.pagina = 1;
        await consultarClassificacoes();

        mostrarMensagem(
            resultado.mensagem ||
            "Classificação excluída com sucesso!"
        );
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

// Monta a interface completa
function montarInterface(secao) {
    secao.innerHTML = `
        <div id="classificacoes-consulta" class="cartao-sistema">
            <h2>Consulta de classificações</h2>

            <div class="barra-consulta">
                <input
                    id="busca-classificacoes"
                    type="search"
                    placeholder="Pesquisar descrição..."
                    aria-label="Pesquisar classificações"
                >

                <select
                    id="filtro-tipo-classificacoes"
                    aria-label="Filtrar tipo"
                >
                    <option value="">Todos os tipos</option>
                    <option value="DESPESA">Despesa</option>
                    <option value="RECEITA">Receita</option>
                </select>

                <button
                    type="button"
                    class="botao-acao"
                    id="btn-buscar-classificacoes"
                >
                    Buscar
                </button>

                <button
                    type="button"
                    class="botao-secundario"
                    id="btn-todas-classificacoes"
                >
                    Todos
                </button>

                <button
                    type="button"
                    class="botao-acao"
                    id="btn-nova-classificacao"
                >
                    Nova classificação
                </button>
            </div>

            <div class="tabela-container">
                <table class="tabela-sistema">
                    <thead><tr></tr></thead>
                    <tbody id="tabela-classificacoes"></tbody>
                </table>
            </div>

            <div class="barra-consulta">
                <button
                    type="button"
                    class="botao-secundario"
                    id="classificacoes-pagina-anterior"
                >
                    Anterior
                </button>

                <span id="classificacoes-info-pagina"></span>

                <button
                    type="button"
                    class="botao-secundario"
                    id="classificacoes-proxima-pagina"
                >
                    Próxima
                </button>
            </div>

            <p
                id="mensagem-classificacoes"
                role="status"
                aria-live="polite"
            ></p>
        </div>

        <div
            id="classificacoes-cadastro"
            class="cartao-sistema"
            hidden
        >
            <h2 id="titulo-form-classificacoes">
                Cadastrar classificação
            </h2>

            <form id="form-classificacoes">
                <input type="hidden" id="classificacao-id">

                <div class="campo-formulario">
                    <label for="classificacao-tipo">
                        Tipo
                    </label>

                    <select id="classificacao-tipo" required>
                        <option value="">Selecione</option>
                        <option value="DESPESA">Despesa</option>
                        <option value="RECEITA">Receita</option>
                    </select>
                </div>

                <div class="campo-formulario">
                    <label for="classificacao-descricao">
                        Descrição
                    </label>

                    <input
                        id="classificacao-descricao"
                        type="text"
                        maxlength="200"
                        required
                        placeholder="Digite a descrição"
                    >
                </div>

                <div class="barra-consulta">
                    <button
                        type="submit"
                        class="botao-acao"
                        id="btn-salvar-classificacao"
                    >
                        Salvar
                    </button>

                    <button
                        type="button"
                        class="botao-secundario"
                        id="btn-cancelar-classificacao"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById("classificacoes-cadastro").hidden = true;

    configurarOrdenacao();
    tabelaVazia("Use Buscar ou Todos para consultar.");
    atualizarPaginacao(0, 1, 0);
}

// Inicializa o módulo
export function configurarClassificacoes() {
    const secao = document.getElementById("tela-classificacoes");

    if (!secao || secao.dataset.configurada === "true") return;

    secao.dataset.configurada = "true";
    montarInterface(secao);

    document.getElementById("btn-buscar-classificacoes")
        .addEventListener("click", () => {
            estado.busca = document.getElementById(
                "busca-classificacoes"
            ).value.trim();

            estado.tipo = document.getElementById(
                "filtro-tipo-classificacoes"
            ).value;

            estado.pagina = 1;
            estado.consultou = true;
            consultarClassificacoes();
        });

    document.getElementById("btn-todas-classificacoes")
        .addEventListener("click", () => {
            estado.busca = "";
            estado.tipo = "";
            estado.pagina = 1;
            estado.consultou = true;

            document.getElementById(
                "busca-classificacoes"
            ).value = "";

            document.getElementById(
                "filtro-tipo-classificacoes"
            ).value = "";

            consultarClassificacoes();
        });

    document.getElementById("busca-classificacoes")
        .addEventListener("keydown", (evento) => {
            if (evento.key === "Enter") {
                evento.preventDefault();
                document.getElementById(
                    "btn-buscar-classificacoes"
                ).click();
            }
        });

    document.getElementById("btn-nova-classificacao")
        .addEventListener("click", () => abrirFormulario());

    document.getElementById("btn-cancelar-classificacao")
        .addEventListener("click", () => mostrarVisualizacao("consulta"));

    document.getElementById("form-classificacoes")
        .addEventListener("submit", salvarClassificacao);

    document.getElementById("classificacoes-pagina-anterior")
        .addEventListener("click", () => {
            if (estado.pagina > 1 && !estado.carregando) {
                estado.pagina--;
                consultarClassificacoes();
            }
        });

    document.getElementById("classificacoes-proxima-pagina")
        .addEventListener("click", () => {
            if (
                estado.pagina < estado.totalPaginas &&
                !estado.carregando
            ) {
                estado.pagina++;
                consultarClassificacoes();
            }
        });
}
