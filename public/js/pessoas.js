
import { requisicao } from "./api.js";

// Estado da consulta
const estado = {
    pagina: 1,
    limite: 10,
    totalPaginas: 0,
    ordenarPor: "id",
    direcao: "ASC",
    busca: "",
    tipo: "",
    consultou: false,
    carregando: false
};

const API = "/api/pessoas";

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

// Mostra mensagens na tela
function mostrarMensagem(texto, erro = false) {
    const mensagem = document.getElementById("mensagem-pessoas");

    if (!mensagem) return;

    mensagem.textContent = texto;
    mensagem.style.color = erro ? "#b42318" : "#008037";
}

// Alterna entre a tabela e o formulário
function mostrarVisualizacao(nome) {
    const consulta = document.getElementById("pessoas-consulta");
    const formulario = document.getElementById("pessoas-cadastro");

    consulta.hidden = nome !== "consulta";
    formulario.hidden = nome !== "cadastro";

    mostrarMensagem("");
}

// Desenha o estado vazio da tabela
function tabelaVazia(texto) {
    const corpo = document.getElementById("tabela-pessoas");

    corpo.replaceChildren();

    const linha = elemento("tr");
    const coluna = elemento("td", texto, "tabela-vazia");

    coluna.colSpan = 5;
    linha.appendChild(coluna);
    corpo.appendChild(linha);
}

// Configura os títulos para ordenação
function configurarOrdenacao() {
    const colunas = [
        ["id", "ID"],
        ["tipo", "Tipo"],
        ["razaoSocial", "Razão social"],
        ["cpfCnpj", "CPF/CNPJ"]
    ];

    const cabecalho = document.querySelector(
        "#pessoas-consulta .tabela-sistema thead tr"
    );

    cabecalho.replaceChildren();

    for (const [campo, titulo] of colunas) {
        const th = elemento("th");
        const botao = elemento("button", titulo);

        botao.type = "button";
        botao.className = "botao-ordenacao";
        botao.dataset.campo = campo;
        botao.style.background = "transparent";
        botao.style.border = "none";
        botao.style.color = "inherit";
        botao.style.font = "inherit";
        botao.style.fontWeight = "inherit";
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
            consultarPessoas();
        });

        th.appendChild(botao);
        cabecalho.appendChild(th);
    }

    cabecalho.appendChild(elemento("th", "Ações"));

    atualizarCabecalho();
}

// Mostra a ordenação atual
function atualizarCabecalho() {
    document.querySelectorAll(".botao-ordenacao").forEach((botao) => {
        const ativo = botao.dataset.campo === estado.ordenarPor;

        botao.setAttribute(
            "aria-label",
            `Ordenar por ${botao.textContent.replace(/[↑↓]/g, "").trim()}`
        );

        const titulo = {
            id: "ID",
            tipo: "Tipo",
            razaoSocial: "Razão social",
            cpfCnpj: "CPF/CNPJ"
        }[botao.dataset.campo];

        botao.textContent = titulo + (
            ativo ? ` ${estado.direcao === "ASC" ? "↑" : "↓"}` : ""
        );
    });
}

// Desenha os registros encontrados
function desenharTabela(pessoas) {
    const corpo = document.getElementById("tabela-pessoas");

    corpo.replaceChildren();

    if (!pessoas.length) {
        tabelaVazia("Nenhuma pessoa ativa encontrada.");
        return;
    }

    for (const pessoa of pessoas) {
        const linha = elemento("tr");

        const valores = [
            pessoa.id,
            pessoa.tipo,
            pessoa.razaosocial,
            pessoa.cpfcnpj
        ];

        for (const valor of valores) {
            linha.appendChild(elemento("td", valor ?? "-"));
        }

        const colunaAcoes = elemento("td");
        const botaoEditar = elemento("button", "Editar", "botao-secundario");
        const botaoExcluir = elemento("button", "Excluir", "botao-secundario");

        botaoEditar.type = "button";
        botaoExcluir.type = "button";

        botaoEditar.addEventListener("click", () => {
            abrirFormulario(pessoa.id);
        });

        botaoExcluir.addEventListener("click", () => {
            excluirPessoa(pessoa.id, pessoa.razaosocial);
        });

        colunaAcoes.append(botaoEditar, " ", botaoExcluir);
        linha.appendChild(colunaAcoes);
        corpo.appendChild(linha);
    }
}

// Atualiza os controles de paginação
function atualizarPaginacao(total, pagina, totalPaginas) {
    const informacao = document.getElementById("pessoas-info-pagina");
    const anterior = document.getElementById("pessoas-pagina-anterior");
    const proxima = document.getElementById("pessoas-proxima-pagina");

    informacao.textContent =
        `Página ${pagina} de ${Math.max(totalPaginas, 1)} — ${total} registro(s)`;

    anterior.disabled = estado.carregando || pagina <= 1;
    proxima.disabled = estado.carregando || pagina >= totalPaginas;
}

// Consulta pessoas com os filtros combinados
async function consultarPessoas() {
    if (estado.carregando) return;

    estado.carregando = true;
    tabelaVazia("Carregando pessoas...");

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
        desenharTabela(resultado.pessoas || []);

        atualizarPaginacao(
            resultado.total || 0,
            resultado.pagina || estado.pagina,
            estado.totalPaginas
        );
    } catch (erro) {
        tabelaVazia("Não foi possível carregar as pessoas.");
        mostrarMensagem(erro.message, true);
    } finally {
        estado.carregando = false;
    }
}

// Abre o formulário de cadastro ou edição
async function abrirFormulario(id = null) {
    const formulario = document.getElementById("form-pessoas");
    const titulo = document.getElementById("titulo-form-pessoas");
    const campoId = document.getElementById("pessoa-id");

    formulario.reset();
    campoId.value = "";
    titulo.textContent = id ? "Editar pessoa" : "Cadastrar pessoa";

    mostrarVisualizacao("cadastro");

    if (!id) return;

    try {
        const resultado = await requisicao(`${API}/${id}`);
        const pessoa = resultado.pessoa;

        campoId.value = pessoa.id;
        document.getElementById("pessoa-tipo").value = pessoa.tipo;
        document.getElementById("pessoa-nome").value = pessoa.razaosocial;
        document.getElementById("pessoa-documento").value = pessoa.cpfcnpj;
    } catch (erro) {
        mostrarVisualizacao("consulta");
        mostrarMensagem(erro.message, true);
    }
}

// Salva o cadastro ou as alterações
async function salvarPessoa(evento) {
    evento.preventDefault();

    const formulario = document.getElementById("form-pessoas");
    const id = document.getElementById("pessoa-id").value;
    const botaoSalvar = document.getElementById("btn-salvar-pessoa");

    const dados = {
        tipo: document.getElementById("pessoa-tipo").value,
        razaoSocial: document.getElementById("pessoa-nome").value.trim(),
        cpfCnpj: document.getElementById("pessoa-documento").value.replace(/\D/g, "")
    };

    if (!dados.tipo || !dados.razaoSocial || ![11, 14].includes(dados.cpfCnpj.length)) {
        window.alert("Preencha o tipo, nome e CPF/CNPJ com 11 ou 14 dígitos.");
        return;
    }

    botaoSalvar.disabled = true;

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
            await consultarPessoas();
        } else {
            tabelaVazia("Use Buscar ou Todos para consultar.");
        }

        mostrarMensagem(
            resultado.mensagem || "Pessoa salva com sucesso!"
        );
    } catch (erro) {
        window.alert(erro.message);
    } finally {
        botaoSalvar.disabled = false;
    }
}

// Exclui apenas logicamente
async function excluirPessoa(id, nome) {
    const confirmado = window.confirm(
        `Deseja excluir a pessoa "${nome}"?\n\n` +
        "O registro ficará inativo e não poderá ser reativado por esta tela."
    );

    if (!confirmado) return;

    try {
        const resultado = await requisicao(`${API}/${id}`, {
            method: "DELETE"
        });

        estado.pagina = 1;
        await consultarPessoas();

        mostrarMensagem(
            resultado.mensagem || "Pessoa excluída com sucesso!"
        );
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

// Monta a interface de consulta e cadastro
function montarInterface(secao) {
    secao.innerHTML = `
        <div id="pessoas-consulta" class="cartao-sistema">
            <h2>Consulta de pessoas</h2>

            <div class="barra-consulta">
                <input
                    id="busca-pessoas"
                    type="search"
                    placeholder="Nome ou CPF/CNPJ"
                    aria-label="Pesquisar pessoas"
                >

                <select id="filtro-tipo-pessoas" aria-label="Filtrar por tipo">
                    <option value="">Todos os tipos</option>
                    <option value="CLIENTE">Cliente</option>
                    <option value="FORNECEDOR">Fornecedor</option>
                    <option value="FATURADO">Faturado</option>
                </select>

                <button type="button" class="botao-acao" id="btn-buscar-pessoas">
                    Buscar
                </button>

                <button type="button" class="botao-secundario" id="btn-todas-pessoas">
                    Todos
                </button>

                <button type="button" class="botao-acao" id="btn-nova-pessoa">
                    Nova pessoa
                </button>
            </div>

            <div class="tabela-container">
                <table class="tabela-sistema">
                    <thead><tr></tr></thead>
                    <tbody id="tabela-pessoas"></tbody>
                </table>
            </div>

            <div class="barra-consulta">
                <button type="button" class="botao-secundario" id="pessoas-pagina-anterior">
                    Anterior
                </button>

                <span id="pessoas-info-pagina"></span>

                <button type="button" class="botao-secundario" id="pessoas-proxima-pagina">
                    Próxima
                </button>
            </div>

            <p id="mensagem-pessoas" role="status" aria-live="polite"></p>
        </div>

        <div id="pessoas-cadastro" class="cartao-sistema" hidden>
            <h2 id="titulo-form-pessoas">Cadastrar pessoa</h2>

            <form id="form-pessoas">
                <input type="hidden" id="pessoa-id">

                <div class="campo-formulario">
                    <label for="pessoa-tipo">Tipo de pessoa</label>
                    <select id="pessoa-tipo" required>
                        <option value="">Selecione</option>
                        <option value="CLIENTE">Cliente</option>
                        <option value="FORNECEDOR">Fornecedor</option>
                        <option value="FATURADO">Faturado</option>
                    </select>
                </div>

                <div class="campo-formulario">
                    <label for="pessoa-nome">Razão social / Nome</label>
                    <input
                        id="pessoa-nome"
                        type="text"
                        maxlength="200"
                        required
                        placeholder="Digite o nome"
                    >
                </div>

                <div class="campo-formulario">
                    <label for="pessoa-documento">CPF/CNPJ</label>
                    <input
                        id="pessoa-documento"
                        type="text"
                        inputmode="numeric"
                        maxlength="18"
                        required
                        placeholder="Digite o CPF ou CNPJ"
                    >
                </div>

                <div class="barra-consulta">
                    <button
                        type="submit"
                        class="botao-acao"
                        id="btn-salvar-pessoa"
                    >
                        Salvar
                    </button>

                    <button
                        type="button"
                        class="botao-secundario"
                        id="btn-cancelar-pessoa"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

    // Mantém a lista e o formulário separados
    document.getElementById("pessoas-cadastro").hidden = true;

    configurarOrdenacao();
    tabelaVazia("Use Buscar ou Todos para consultar.");
    atualizarPaginacao(0, 1, 0);
}

// Inicializa a tela de Pessoas
export function configurarPessoas() {
    const secao = document.getElementById("tela-pessoas");

    if (!secao || secao.dataset.configurada === "true") return;

    secao.dataset.configurada = "true";
    montarInterface(secao);

    document.getElementById("btn-buscar-pessoas")
        .addEventListener("click", () => {
            estado.busca = document.getElementById("busca-pessoas").value.trim();
            estado.tipo = document.getElementById("filtro-tipo-pessoas").value;
            estado.pagina = 1;
            estado.consultou = true;
            consultarPessoas();
        });

    document.getElementById("btn-todas-pessoas")
        .addEventListener("click", () => {
            estado.busca = "";
            estado.tipo = "";
            estado.pagina = 1;
            estado.consultou = true;

            document.getElementById("busca-pessoas").value = "";
            document.getElementById("filtro-tipo-pessoas").value = "";

            consultarPessoas();
        });

    document.getElementById("busca-pessoas")
        .addEventListener("keydown", (evento) => {
            if (evento.key === "Enter") {
                evento.preventDefault();
                document.getElementById("btn-buscar-pessoas").click();
            }
        });

    document.getElementById("btn-nova-pessoa")
        .addEventListener("click", () => abrirFormulario());

    document.getElementById("btn-cancelar-pessoa")
        .addEventListener("click", () => mostrarVisualizacao("consulta"));

    document.getElementById("form-pessoas")
        .addEventListener("submit", salvarPessoa);

    document.getElementById("pessoas-pagina-anterior")
        .addEventListener("click", () => {
            if (estado.pagina > 1 && !estado.carregando) {
                estado.pagina--;
                consultarPessoas();
            }
        });

    document.getElementById("pessoas-proxima-pagina")
        .addEventListener("click", () => {
            if (
                estado.pagina < estado.totalPaginas &&
                !estado.carregando
            ) {
                estado.pagina++;
                consultarPessoas();
            }
        });
}
