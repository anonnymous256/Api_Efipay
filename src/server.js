if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const bodyParser = require('body-parser');
const GNRequest = require('./apis/gerencianet');
const QRCode = require('qrcode'); // Biblioteca para gerar o QR Code

const app = express();

app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', 'src/views');

const reqGNAlready = GNRequest({
  clientID: process.env.GN_CLIENT_ID,
  clientSecret: process.env.GN_CLIENT_SECRET
});

// Rota principal para gerar o QR Code PIX
app.get('/', async (req, res) => {
  try {
    const reqGN = await reqGNAlready;
    
    // Dados da cobrança
    const dataCob = {
      calendario: {
        expiracao: 3600
      },
      valor: {
        original: '0.10'
      },
      chave: 'af08alexa@gmail.com',
      solicitacaoPagador: 'Cobrança dos serviços prestados.'
    };

    // Criação da cobrança
    const cobResponse = await reqGN.post('/v2/cob', dataCob);
    const locId = cobResponse.data.loc.id;

    // Geração do código Pix Copia e Cola
    const qrcodeResponse = await reqGN.get(`/v2/loc/${locId}/qrcode`);
    const pixCopiaECola = qrcodeResponse.data.qrcode;

    // Geração do QR Code como imagem base64
    const qrcodeImage = await QRCode.toDataURL(pixCopiaECola);

    // Renderiza o QR Code em uma página HTML
    res.send(`
      <html>
          <head>
              <title>QR Code PIX</title>
          </head>
          <body>
              <h2>QR Code PIX</h2>
              <img src="${qrcodeImage}" alt="QR Code PIX" />
              <p><strong>Pix Copia e Cola:</strong></p>
              <pre>${pixCopiaECola}</pre>
          </body>
      </html>
    `);

  } catch (error) {
    console.error("Erro ao gerar o QR Code PIX:", error.response?.data || error.message);
    res.status(500).send("Erro ao gerar o QR Code PIX");
  }
});

// Rota POST para criar uma cobrança
app.post('/v2/cob', async (req, res) => {
  try {
    const reqGN = await reqGNAlready;

    const dataCob = {
      calendario: { expiracao: 3600 },
      valor: { original: '0.10' },
      chave: 'af08alexa@gmail.com',
      solicitacaoPagador: 'Cobrança gerada via API'
    };

    const cobResponse = await reqGN.post('/v2/cob', dataCob);
    res.status(201).json(cobResponse.data);
  } catch (error) {
    console.error("Erro ao criar cobrança:", error);
    res.status(500).json({ message: 'Erro ao criar cobrança', error: error.message });
  }
});

// Rota para listar cobranças
app.get('/cobrancas', async (req, res) => {
  try {
    const reqGN = await reqGNAlready;
    const cobResponse = await reqGN.get('/v2/cob?inicio=2021-02-15T16:01:35Z&fim=2021-02-22T23:59:00Z');
    res.send(cobResponse.data);
  } catch (error) {
    console.error("Erro ao buscar cobranças:", error);
    res.status(500).send("Erro ao buscar cobranças");
  }
});

// Rota Webhook
app.post('/webhook(/pix)?', (req, res) => {
  console.log('Webhook recebido:', req.body);
  res.send('200');
});

// Inicialização do servidor
app.listen(8000, () => {
  console.log('Servidor rodando na porta 8000');
});
