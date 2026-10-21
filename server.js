
require('dotenv').config({ path: '.env.local' });

const app = require('./src/servidor');

const PORT = process.env.PORT || 3000;

// Inicia o servidor local
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
