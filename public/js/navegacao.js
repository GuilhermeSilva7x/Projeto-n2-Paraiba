
// Exibe a tela selecionada
export function abrirTela(nomeTela) {
    document.querySelectorAll(".tela").forEach((tela) => {
        tela.classList.toggle(
            "ativa",
            tela.id === `tela-${nomeTela}`
        );
    });

    document.querySelectorAll(".menu-item").forEach((botao) => {
        const ativo = botao.dataset.tela === nomeTela;

        botao.classList.toggle("ativo", ativo);
        botao.setAttribute("aria-current", ativo ? "page" : "false");
    });

    const titulos = {
        dashboard: "Dashboard",
        contas: "Contas a Pagar",
        pessoas: "Pessoas",
        classificacoes: "Classificações",
        extracao: "Extrair Nota Fiscal"
    };

    const titulo = document.getElementById("titulo-pagina");

    if (titulo) {
        titulo.textContent = titulos[nomeTela] || "Sistema Paraíba";
    }
}

// Configura os botões do menu
export function configurarNavegacao() {
    document.querySelectorAll(".menu-item").forEach((botao) => {
        botao.addEventListener("click", () => {
            abrirTela(botao.dataset.tela);
        });
    });
}
