
const express = require("express");

const {
    login,
    me,
    logout
} = require("../controllers/authController");

const {
    exigirAutenticacao
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Realiza o login
router.post("/login", login);

// Consulta a sessão
router.get(
    "/me",
    exigirAutenticacao,
    me
);

// Encerra a sessão
router.post(
    "/logout",
    exigirAutenticacao,
    logout
);

module.exports = router;
