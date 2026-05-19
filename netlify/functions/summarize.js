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
    const { text, format, isFinal, originalFormat } = await req.json();

    const prompts = {
      bullets: `Ты — аналитик деловых переговоров. Создай структурированное саммари совещания:\n\n**КЛЮЧЕВЫЕ ТЕМЫ** — что обсуждалось\n**ПРИНЯТЫЕ РЕШЕНИЯ** — конкретные договорённости\n**ОТКРЫТЫЕ ВОПРОСЫ** — что осталось без ответа\n**ОБЩАЯ АТМОСФЕРА** — кратко о тоне разговора\n\nБудь конкретным, не лей воду. Пиши по-русски.`,
      action: `Ты — project manager. Выдели из совещания:\n\n**ACTION ITEMS** — "Задача → Ответственный → Срок"\n**ЗАВИСИМОСТИ** — что от чего зависит\n**РИСКИ И ПРОБЛЕМЫ** — что упоминалось как препятствие\n\nТолько конкретные действия. По-русски.`,
      narrative: `Напиши связный пересказ совещания в 3-5 абзацах. Сохрани суть, убери лишнее. По-русски.`,
      full: `Создай полный отчёт о совещании:\n\n**УЧАСТНИКИ** (если упомянуты)\n**ПОВЕСТКА** — темы\n**ДЕТАЛЬНОЕ ОБСУЖДЕНИЕ** — ключевые моменты\n**РЕШЕНИЯ**\n**ЗАДАЧИ** — action items\n**СЛЕДУЮЩИЕ ШАГИ**\n**ВЫВОДЫ**\n\nПиши по-русски, структурировано.`
    };

    const fmt = isFinal ? (originalFormat || 'bullets') : format;
    const systemPrompt = isFinal
      ? `Ты — аналитик. Объедини саммари нескольких частей совещания в единое ${fmt === 'bullets' ? 'структурированное саммари' : fmt === 'action' ? 'список action items' : fmt === 'narrative' ? 'связный пересказ' : 'полный отчёт'}. Пиши по-русски.`
      : (prompts[format] || prompts.bullets);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'ТРАНСКРИПЦИЯ СОВЕЩАНИЯ:\n\n' + text }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || 'Groq error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ summary: data.choices?.[0]?.message?.content || '' }), {
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

export const config = { path: '/api/summarize' };
