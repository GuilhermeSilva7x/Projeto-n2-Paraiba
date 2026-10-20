
const express = require('express');
const router = express.Router();

const controller = require('../controllers/contasController');
const manualController = require('../controllers/contasManualController');

// Salva uma nota fiscal pelo agente
router.post('/', controller.salvarConta);

// Cadastra uma conta manualmente
router.post('/manual', manualController.criarContaManual);

// Lista contas ativas
router.get('/', controller.listarContas);

// Busca conta por ID
router.get('/:id', controller.buscarConta);

// Edita movimento e parcela
router.put('/:id', controller.editarConta);

// Exclusão lógica
router.delete('/:id', controller.excluirConta);

module.exports = router;
