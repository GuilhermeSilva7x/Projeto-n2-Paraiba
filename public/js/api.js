
// Centraliza as requisições HTTP
export async function requisicao(caminho, opcoes = {}) {
    let resposta;

    try {
        resposta = await fetch(caminho, {
            credentials: "same-origin",
            ...opcoes,
            headers: {
                ...opcoes.headers
            }
        });
    } catch {
        throw new Error("Não foi possível conectar ao servidor.");
    }

    // Trata sessão expirada
    if (resposta.status === 401) {
        window.location.replace("/login.html");
        throw new Error("Sessão expirada.");
    }

    const tipo = resposta.headers.get("content-type") || "";

    if (!tipo.includes("application/json")) {
        throw new Error("Resposta inválida do servidor.");
    }

    const dados = await resposta.json();

    if (!resposta.ok || dados.sucesso === false) {
        throw new Error(
            dados.mensagem ||
            dados.erro ||
            "Erro ao realizar a operação."
        );
    }

    return dados;
}
