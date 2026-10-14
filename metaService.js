const crypto = require('crypto');
const axios = require('axios');

function hashSha256(value) {
  if (!value) return null;
  const clean = String(value).trim().toLowerCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

function normalizePhone(rawPhone) {
  if (!rawPhone) return null;
  let phone = String(rawPhone).replace(/@s\.whatsapp\.net/gi, '').replace(/\D/g, '');
  return phone ? hashSha256(phone) : null;
}

async function sendPurchaseEvent({ phone, email, value, currency, eventSourceUrl }) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    throw new Error('META_PIXEL_ID ou META_ACCESS_TOKEN não configurados.');
  }

  const userData = {};
  const hashedPhone = normalizePhone(phone);
  if (hashedPhone) userData.ph = [hashedPhone];

  if (email) {
    const hashedEmail = hashSha256(email);
    if (hashedEmail) userData.em = [hashedEmail];
  }

  const eventData = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
    custom_data: {
      currency: currency || process.env.DEFAULT_CURRENCY || 'USD',
      value: Number(value) || 0
    }
  };

  if (eventSourceUrl) {
    eventData.event_source_url = eventSourceUrl;
  }

  const payload = {
    data: [eventData]
  };

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
  const response = await axios.post(url, payload);
  return response.data;
}

module.exports = {
  hashSha256,
  normalizePhone,
  sendPurchaseEvent
};
