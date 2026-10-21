
const crypto = require("crypto");
const pool = require("../config/database");

// Cria o hash da senha
function criarHashSenha(senha) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(senha, salt, 64)
        .toString("hex");

    return `${salt}:${hash}`;
}

// Verifica a senha informada
function verificarSenha(senha, senhaHash) {
    const [salt, valor] = String(senhaHash || "").split(":");

    if (
        !salt ||
        !valor ||
        !/^[a-f0-9]{128}$/i.test(valor)
    ) {
        return false;
    }

    const esperado = Buffer.from(valor, "hex");

    const recebido = crypto.scryptSync(
        senha,
        salt,
        esperado.length
    );

    return crypto.timingSafeEqual(
        esperado,
        recebido
    );
}

// Autentica o usuário
async function autenticar(email, senha) {
    const resultado = await pool.query(
        `SELECT id, email, senha_hash, ativo
         FROM usuarios_sistema
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
        [email]
    );

    const usuario = resultado.rows[0];

    if (
        !usuario ||
        !usuario.ativo ||
        !verificarSenha(senha, usuario.senha_hash)
    ) {
        return null;
    }

    return {
        id: usuario.id,
        email: usuario.email
    };
}

// Busca um usuário ativo
async function buscarUsuario(id) {
    const resultado = await pool.query(
        `SELECT id, email
         FROM usuarios_sistema
         WHERE id = $1 AND ativo = TRUE`,
        [id]
    );

    return resultado.rows[0] || null;
}

module.exports = {
    criarHashSenha,
    autenticar,
    buscarUsuario
};
