
const path = require("path");

// Carrega as variáveis locais
require("dotenv").config({
    path: path.resolve(__dirname, "../.env.local")
});

const pool = require("../src/config/database");

const {
    criarHashSenha
} = require("../src/services/authService");

// Cria o usuário autorizado
async function criarUsuario() {
    const email = process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const senha = process.env.ADMIN_PASSWORD;

    // Valida os dados
    if (
        !email ||
        !senha ||
        senha.length < 12
    ) {
        throw new Error(
            "Informe ADMIN_EMAIL e ADMIN_PASSWORD com senha de pelo menos 12 caracteres."
        );
    }

    // Cria a tabela, caso não exista
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios_sistema (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // Verifica se já existe outro usuário
    const existentes = await pool.query(
        "SELECT id, email FROM usuarios_sistema LIMIT 2"
    );

    if (
        existentes.rows.some(
            usuario =>
                usuario.email.toLowerCase() !== email
        )
    ) {
        throw new Error(
            "Já existe outro usuário cadastrado. Nenhuma conta foi alterada."
        );
    }

    // Protege a senha
    const senhaHash = criarHashSenha(senha);

    // Cria ou atualiza o usuário
    await pool.query(
        `INSERT INTO usuarios_sistema
            (email, senha_hash, ativo)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (email)
         DO UPDATE SET
            senha_hash = EXCLUDED.senha_hash,
            ativo = TRUE`,
        [email, senhaHash]
    );

    console.log(
        "Usuário autorizado configurado:",
        email
    );
}

// Executa o cadastro
criarUsuario()
    .catch((erro) => {
        console.error(
            "Erro ao criar usuário:",
            erro.message
        );

        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
