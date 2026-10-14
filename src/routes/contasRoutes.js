
const express = require('express');
const router = express.Router();

const controller = require('../controllers/contasController');

// Salva uma conta
router.post('/', controller.salvarConta);

// Lista e busca contas
router.get('/', controller.listarContas);

// Busca por ID
router.get('/:id', controller.buscarConta);

// Edita movimento e parcela
router.put('/:id', controller.editarConta);

// Exclusão lógica
router.delete('/:id', controller.excluirConta);

module.exports = router;
