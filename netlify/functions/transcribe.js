exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };

  try {
    const contentType = event.headers['content-type'] || '';
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': contentType },
      body: body
    });

    const text = await response.text();
    if (!response.ok) return { statusCode: response.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: text }) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
