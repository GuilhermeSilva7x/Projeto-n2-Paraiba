
const express = require('express');
const router = express.Router();

const controller = require('../controllers/classificacaoController');

// Cadastro
router.post('/', controller.criarClassificacao);

// Listagem e busca
router.get('/', controller.listarClassificacoes);

// Busca por ID
router.get('/:id', controller.buscarClassificacao);

// Edição
router.put('/:id', controller.editarClassificacao);

// Exclusão lógica
router.delete('/:id', controller.excluirClassificacao);

module.exports = router;
