
const {
    autenticar
} = require("../services/authService");

const {
    gerarToken,
    configurarCookie
} = require("../middlewares/authMiddleware");

// Realiza o login
async function login(req, res, next) {
    try {
        const { email, senha } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof senha !== "string" ||
            !email.trim() ||
            !senha ||
            email.length > 254 ||
            senha.length > 1024
        ) {
            return res.status(400).json({
                erro: "Informe e-mail e senha válidos."
            });
        }

        const usuario = await autenticar(
            email.trim(),
            senha
        );

        if (!usuario) {
            return res.status(401).json({
                erro: "E-mail ou senha incorretos."
            });
        }

        // Cria a sessão
        configurarCookie(
            res,
            gerarToken(usuario)
        );

        return res.json({
            usuario
        });

    } catch (erro) {
        next(erro);
    }
}

// Retorna o usuário autenticado
function me(req, res) {
    res.json({
        usuario: req.usuario
    });
}

// Encerra a sessão no navegador
function logout(req, res) {
    configurarCookie(res, "");

    res.json({
        mensagem: "Sessão encerrada."
    });
}

module.exports = {
    login,
    me,
    logout
};
