
import {
    abrirTela,
    configurarNavegacao
} from "./navegacao.js";

import { configurarContas } from "./contas.js";
import { configurarNovaConta } from "./novaConta.js";
import { configurarAnaliseNF } from "./analiseNF.js";
import { configurarPessoas } from "./pessoas.js";
import { configurarClassificacoes } from "./classificacoes.js";
import { requisicao } from "./api.js";

// Ícones do menu
const icones = {
    dashboard: `
        <rect x="3" y="3" width="7" height="9" rx="1"/>
        <rect x="14" y="3" width="7" height="5" rx="1"/>
        <rect x="14" y="12" width="7" height="9" rx="1"/>
        <rect x="3" y="16" width="7" height="5" rx="1"/>
    `,

    extracao: `
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
        <path d="M14 2v6h6"/>
        <path d="M8 13h8"/>
        <path d="M8 17h8"/>
    `,

    contas: `
        <rect x="3" y="5" width="18" height="15" rx="2"/>
        <path d="M3 9h18"/>
        <path d="M7 15h4"/>
    `,

    pessoas: `
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 1-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    `,

    classificacoes: `
        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0l-8.17-8.17A2 2 0 0 1 2 11V4a2 2 0 0 1 2-2h7a2 2 0 0 1 1.41.59l8.18 8.18a2 2 0 0 1 0 2.64Z"/>
        <circle cx="7.5" cy="7.5" r=".7" fill="currentColor" stroke="none"/>
    `,

    sair: `
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <path d="m16 17 5-5-5-5"/>
        <path d="M21 12H9"/>
    `
};

// Cria um ícone SVG
function criarIcone(conteudo) {
    return `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            ${conteudo}
        </svg>
    `;
}

// Configura os ícones do menu
function configurarIcones() {
    document.querySelectorAll(".menu-item").forEach((botao) => {
        const nome = botao.dataset.tela;
        const elemento = botao.querySelector(".menu-icone");

        if (elemento && icones[nome]) {
            elemento.innerHTML = criarIcone(icones[nome]);
        }
    });

    const botaoSair = document.getElementById("btn-logout");

    if (botaoSair) {
        const elemento = botaoSair.querySelector(".menu-icone");

        if (elemento) {
            elemento.innerHTML = criarIcone(icones.sair);
        }
    }
}

// Cria o identificador de versão no rodapé
function criarRodapeVersao() {
    const rodapeMenu = document.querySelector(".menu-rodape");

    if (!rodapeMenu || document.getElementById("versao-git")) {
        return;
    }

    const painel = document.createElement("div");

    painel.id = "versao-git";

    painel.style.cssText = `
        padding: 12px 14px 16px;
        margin-bottom: 12px;
        border-bottom: 1px solid #42515f;
        color: #d6dee6;
        font-size: 12px;
        line-height: 1.6;
        overflow-wrap: anywhere;
    `;

    const titulo = document.createElement("div");
    titulo.textContent = "ÚLTIMA ATUALIZAÇÃO NO GITHUB";
    titulo.style.cssText = `
        color: #aebdca;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-bottom: 7px;
    `;

    const branch = document.createElement("div");
    branch.id = "versao-git-branch";
    branch.textContent = "Branch: consultando...";

    const commit = document.createElement("div");
    commit.id = "versao-git-commit";
    commit.textContent = "Commit: consultando...";

    painel.append(titulo, branch, commit);

    rodapeMenu.prepend(painel);
}

// Consulta a versão do código executado
async function carregarVersaoGit() {
    const branchElemento = document.getElementById(
        "versao-git-branch"
    );

    const commitElemento = document.getElementById(
        "versao-git-commit"
    );

    if (!branchElemento || !commitElemento) return;

    try {
        const resposta = await requisicao("/api/versao", {
            cache: "no-store"
        });

        const versao = resposta.versao || {};

        branchElemento.textContent = versao.branch
            ? `Branch: ${versao.branch}`
            : "Branch: indisponível";

        commitElemento.textContent = versao.commitCurto
            ? `Commit: ${versao.commitCurto}`
            : "Commit: indisponível";

        if (versao.commit) {
            commitElemento.title = versao.commit;
        }

    } catch (erro) {
        console.error(
            "Não foi possível consultar a versão:",
            erro
        );

        branchElemento.textContent =
            "Branch: indisponível";

        commitElemento.textContent =
            "Commit: indisponível";
    }
}

// Inicializa os módulos do sistema
function iniciarSistema() {
    configurarIcones();
    configurarNavegacao();

    configurarContas();
    configurarNovaConta();
    configurarAnaliseNF();
    configurarPessoas();
    configurarClassificacoes();

    // Exibe branch e commit da versão executada
    criarRodapeVersao();
    carregarVersaoGit();

    abrirTela("dashboard");
}

iniciarSistema();
