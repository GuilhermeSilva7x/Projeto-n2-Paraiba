
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const agenteExtrairNF = require('./agentes/agenteExtrairNF');

const pessoasRoutes = require('./routes/pessoasRoutes');
const classificacaoRoutes = require('./routes/classificacaoRoutes');
const analiseRoutes = require('./routes/analiseRoutes');
const contasRoutes = require('./routes/contasRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rotas de cadastros
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/classificacoes', classificacaoRoutes);

// Rotas de contas
app.use('/api/contas/analisar', analiseRoutes);
app.use('/api/contas', contasRoutes);

const upload = multer({
    storage: multer.memoryStorage()
});

const agente = new agenteExtrairNF();

// Processa o PDF com Gemini
app.post('/api/pdf/processar', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                erro: 'Nenhum pdf enviado'
            });
        }

        const apiKey =
            req.body.apiKey ||
            req.body.apikey ||
            req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(400).json({
                erro: 'Digite a API'
            });
        }

        console.log('PDF recebido:', req.file.originalname);

        const resultadoJSON = await agente.executar(
            req.file.buffer,
            apiKey
        );

        return res.json(resultadoJSON);
    } catch (erro) {
        console.error('Erro no servidor:', erro);

        return res.status(500).json({
            erro: erro.message
        });
    }
});

module.exports = app;
