
const express = require('express');
const router = express.Router();

const pessoasController = require('../controllers/pessoasController');

// Cadastro
router.post('/', pessoasController.criarPessoa);

// Listagem e busca
router.get('/', pessoasController.listarPessoas);

// Busca por ID
router.get('/:id', pessoasController.buscarPessoa);

// Edição
router.put('/:id', pessoasController.editarPessoa);

// Exclusão lógica
router.delete('/:id', pessoasController.excluirPessoa);

module.exports = router;
