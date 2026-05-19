export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Пробрасываем multipart/form-data напрямую в Groq
    const formData = await req.formData();
    const lang = formData.get('language') || '';

    const groqForm = new FormData();
    groqForm.append('file', formData.get('file'));
    groqForm.append('model', 'whisper-large-v3-turbo');
    groqForm.append('response_format', 'text');
    if (lang) groqForm.append('language', lang);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqForm
    });

    const text = await response.text();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: text }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/transcribe' };
