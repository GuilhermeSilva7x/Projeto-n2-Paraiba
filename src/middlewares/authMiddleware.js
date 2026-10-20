
const crypto = require("crypto");

const {
    buscarUsuario
} = require("../services/authService");

const NOME_COOKIE = "paraiba_auth";
const DURACAO_SEGUNDOS = 8 * 60 * 60;

// Obtém o segredo da autenticação
function segredo() {
    if (
        !process.env.AUTH_SECRET ||
        process.env.AUTH_SECRET.length < 32
    ) {
        throw new Error(
            "Configure AUTH_SECRET com pelo menos 32 caracteres."
        );
    }

    return process.env.AUTH_SECRET;
}

// Assina o token de autenticação
function assinatura(payload) {
    return crypto
        .createHmac("sha256", segredo())
        .update(payload)
        .digest("base64url");
}

// Gera o token de sessão
function gerarToken(usuario) {
    const payload = Buffer.from(
        JSON.stringify({
            id: usuario.id,
            exp:
                Math.floor(Date.now() / 1000) +
                DURACAO_SEGUNDOS
        })
    ).toString("base64url");

    return `${payload}.${assinatura(payload)}`;
}

// Valida o token recebido
function lerToken(token) {
    if (typeof token !== "string") {
        return null;
    }

    const partes = token.split(".");

    if (partes.length !== 2) {
        return null;
    }

    const [payload, hash] = partes;

    const esperado = Buffer.from(
        assinatura(payload)
    );

    const recebido = Buffer.from(hash);

    if (
        esperado.length !== recebido.length ||
        !crypto.timingSafeEqual(esperado, recebido)
    ) {
        return null;
    }

    try {
        const dados = JSON.parse(
            Buffer.from(payload, "base64url")
                .toString("utf8")
        );

        if (
            !Number.isSafeInteger(dados.id) ||
            !Number.isSafeInteger(dados.exp) ||
            dados.exp <= Date.now() / 1000
        ) {
            return null;
        }

        return dados;

    } catch {
        return null;
    }
}

// Lê o cookie da requisição
function lerCookie(req) {
    const entrada = (req.headers.cookie || "")
        .split(";")
        .map((item) => item.trim());

    const cookie = entrada.find(
        (item) => item.startsWith(
            `${NOME_COOKIE}=`
        )
    );

    return cookie
        ? cookie.slice(NOME_COOKIE.length + 1)
        : null;
}

// Configura o cookie da sessão
function configurarCookie(res, token) {
    const producao =
        process.env.NODE_ENV === "production" ||
        Boolean(process.env.VERCEL);

    const partes = [
        `${NOME_COOKIE}=${token}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/"
    ];

    if (producao) {
        partes.push("Secure");
    }

    if (token) {
        partes.push(
            `Max-Age=${DURACAO_SEGUNDOS}`
        );
    } else {
        partes.push("Max-Age=0");
    }

    res.setHeader(
        "Set-Cookie",
        partes.join("; ")
    );
}

// Protege as rotas privadas
async function exigirAutenticacao(req, res, next) {
    try {
        const dados = lerToken(
            lerCookie(req)
        );

        if (dados) {
            const usuario = await buscarUsuario(
                dados.id
            );

            if (usuario) {
                req.usuario = usuario;
                return next();
            }
        }

        if (
            req.path === "/" ||
            req.path === "/index.html"
        ) {
            return res.redirect("/login.html");
        }

        return res.status(401).json({
            erro: "Faça login para continuar."
        });

    } catch (erro) {
        next(erro);
    }
}

module.exports = {
    gerarToken,
    configurarCookie,
    exigirAutenticacao
};
