require('dotenv').config();
const express = require('express');
const cors =  require('cors');
const multer  = require('multer');
const agenteExtrairNF = require('./agentes/agenteExtrairNF');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({storage : multer.memoryStorage()});
const agente = new agenteExtrairNF();

app.post('/api/pdf/processar', upload.single('pdf'), async(req, res) =>{
    try{

        if(!req.file)
        {
            return res.status(400).json({erro : 'Nenhum pdf enviado'});

        }

        console.log("Pdf recebido", req.file.originalname);

        const resultadoJSON = await agente.executar(req.file.buffer);

        return res.json(resultadoJSON);

    }

    catch(erro){

        console.error("Erro no servidor", erro);
        return res.status(500).json({erro : erro.message});
    }
});

app.listen(PORT, ()=>{
    console.log("Servidor Rodando ");
});