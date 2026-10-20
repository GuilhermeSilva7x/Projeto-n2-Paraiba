
const express = require('express');
const router = express.Router();

const analiseController = require('../controllers/analiseController');

// Analisa os dados antes de salvar
router.post('/', analiseController.analisarNotaFiscal);

module.exports = router;
