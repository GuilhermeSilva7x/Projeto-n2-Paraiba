
const express = require("express");
const path = require("path");
const multer = require("multer");

const agenteExtrairNF = require(
    "./agentes/agenteExtrairNF"
);

const pessoasRoutes = require(
    "./routes/pessoasRoutes"
);

const classificacaoRoutes = require(
    "./routes/classificacaoRoutes"
);

const analiseRoutes = require(
    "./routes/analiseRoutes"
);

const contasRoutes = require(
    "./routes/contasRoutes"
);

const authRoutes = require(
    "./routes/authRoutes"
);

const {
    exigirAutenticacao
} = require("./middlewares/authMiddleware");

const app = express();

// Configura o recebimento de JSON
app.use(express.json({
    limit: "1mb"
}));

// Disponibiliza os arquivos públicos
app.use(
    express.static(
        path.join(__dirname, "../public"),
        { index: false }
    )
);

// Rotas públicas de autenticação
app.use("/api/auth", authRoutes);

app.get("/login.html", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../public/login.html"
        )
    );
});

// Protege a página principal
app.get(
    ["/", "/index.html"],
    exigirAutenticacao,
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "../private/index.html"
            )
        );
    }
);

// Protege as rotas financeiras
app.use(
    "/api/pessoas",
    exigirAutenticacao,
    pessoasRoutes
);

app.use(
    "/api/classificacoes",
    exigirAutenticacao,
    classificacaoRoutes
);

app.use(
    "/api/contas/analisar",
    exigirAutenticacao,
    analiseRoutes
);

app.use(
    "/api/contas",
    exigirAutenticacao,
    contasRoutes
);

// Configura o upload de PDF
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

const agente = new agenteExtrairNF();

// Extrai os dados de um PDF
app.post(
    "/api/pdf/processar",
    exigirAutenticacao,
    upload.single("pdf"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    erro: "Nenhum PDF enviado."
                });
            }

            const apiKey =
                req.body.apiKey ||
                req.body.apikey ||
                req.headers["x-api-key"];

            if (!apiKey) {
                return res.status(400).json({
                    erro: "Digite a API."
                });
            }

            const resultadoJSON = await agente.executar(
                req.file.buffer,
                apiKey
            );

            return res.json(resultadoJSON);

        } catch (erro) {
            console.error(
                "Erro ao processar PDF:",
                erro
            );

            return res.status(500).json({
                erro: "Erro ao processar o PDF."
            });
        }
    }
);

// Trata erros inesperados
app.use((erro, req, res, next) => {
    console.error("Erro no servidor:", erro);

    res.status(500).json({
        erro: "Erro interno do servidor."
    });
});

module.exports = app;

// Inicia o servidor apenas em execução local
if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}
