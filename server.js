require('dotenv').config();
const express = require('express');
const { sendPurchaseEvent } = require('./metaService');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Servidor Webhook Leona/Hotmart/Meta CAPI ativo.');
});

// Endpoint Leona (Pix / Vendas WhatsApp)
app.post('/webhook/leona', async (req, res) => {
  console.log('--- Webhook Leona Recebido ---');
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const data = req.body || {};
    const phone = data.phone || data.whatsapp || data.telefone || data.remoteJid || (data.contact && data.contact.phone);
    const value = data.value || data.amount || data.price || data.total || 0;
    const currency = data.currency || process.env.DEFAULT_CURRENCY || 'USD';
    const email = data.email || null;

    const result = await sendPurchaseEvent({
      phone,
      email,
      value,
      currency,
      eventSourceUrl: 'https://wa.me'
    });

    console.log('Evento enviado para a Meta:', result);
    return res.status(200).json({ success: true, meta: result });
  } catch (error) {
    console.error('Erro ao processar Leona:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint Hotmart
app.post('/webhook/hotmart', async (req, res) => {
  console.log('--- Webhook Hotmart Recebido ---');
  console.log(JSON.stringify(req.body, null, 2));

  const receivedHottok = req.headers['x-hotmart-hottok'] || req.body.hottok;
  if (process.env.HOTMART_HOTTOK && receivedHottok !== process.env.HOTMART_HOTTOK) {
    console.warn('Aviso: Hottok inválido');
    return res.status(401).json({ error: 'Token Hottok inválido' });
  }

  try {
    const data = req.body.data || req.body;
    const event = req.body.event;

    if (event && event !== 'PURCHASE_APPROVED') {
      return res.status(200).json({ message: 'Evento ignorado (não é PURCHASE_APPROVED)' });
    }

    const buyer = data.buyer || {};
    const purchase = data.purchase || {};
    const phone = buyer.checkout_phone || buyer.phone;
    const email = buyer.email;
    const value = (purchase.price && purchase.price.value) || data.value || 0;
    const currency = (purchase.price && purchase.price.currency_value_code) || process.env.DEFAULT_CURRENCY || 'USD';

    const result = await sendPurchaseEvent({
      phone,
      email,
      value,
      currency
    });

    return res.status(200).json({ success: true, meta: result });
  } catch (error) {
    console.error('Erro ao processar Hotmart:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a executar na porta ${PORT}`);
});
