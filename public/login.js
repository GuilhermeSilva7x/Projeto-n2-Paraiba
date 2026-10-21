
const formulario = document.getElementById("form-login");
const mensagem = document.getElementById("mensagem");
const botao = document.getElementById("btn-entrar");

// Exibe mensagens na tela
function mostrarMensagem(texto) {
    mensagem.textContent = texto;
    mensagem.hidden = false;
}

// Verifica se já existe uma sessão
async function verificarSessao() {
    try {
        const resposta = await fetch("/api/auth/me", {
            credentials: "same-origin"
        });

        if (resposta.ok) {
            window.location.replace("/");
        }
    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
    }
}

// Realiza o login
async function fazerLogin(evento) {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    mensagem.hidden = true;
    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        const resposta = await fetch("/api/auth/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "same-origin",

            body: JSON.stringify({
                email,
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível entrar."
            );
        }

        // Abre o sistema financeiro
        window.location.replace("/");

    } catch (erro) {
        console.error("Erro no login:", erro);
        mostrarMensagem(erro.message);

    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar no sistema";
    }
}

// Configura o formulário
formulario.addEventListener("submit", fazerLogin);

// Verifica a sessão ao abrir a página
verificarSessao();
