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
      bullets: `Ты — аналитик деловых переговоров. Создай структурированное саммари совещания:

**КЛЮЧЕВЫЕ ТЕМЫ** — что обсуждалось
**ПРИНЯТЫЕ РЕШЕНИЯ** — конкретные договорённости
**ОТКРЫТЫЕ ВОПРОСЫ** — что осталось без ответа
**ОБЩАЯ АТМОСФЕРА** — кратко о тоне разговора

Будь конкретным, не лей воду. Пиши по-русски.`,

      action: `Ты — project manager. Выдели из совещания:

**ACTION ITEMS** — "Задача → Ответственный → Срок"
**ЗАВИСИМОСТИ** — что от чего зависит
**РИСКИ И ПРОБЛЕМЫ** — что упоминалось как препятствие

Только конкретные действия. По-русски.`,

      narrative: `Напиши связный пересказ совещания в 3-5 абзацах. Сохрани суть, убери лишнее. По-русски.`,

      full: `Создай полный отчёт о совещании:

**УЧАСТНИКИ** (если упомянуты)
**ПОВЕСТКА** — темы
**ДЕТАЛЬНОЕ ОБСУЖДЕНИЕ** — ключевые моменты
**РЕШЕНИЯ**
**ЗАДАЧИ** — action items
**СЛЕДУЮЩИЕ ШАГИ**
**ВЫВОДЫ**

Пиши по-русски, структурировано.`
    };

    const fmt = isFinal ? (originalFormat || 'bullets') : format;
    const systemPrompt = isFinal
      ? `Ты — аналитик. Тебе даны саммари нескольких частей длинного совещания. Объедини их в единое ${fmt === 'bullets' ? 'структурированное саммари с тезисами и решениями' : fmt === 'action' ? 'список action items' : fmt === 'narrative' ? 'связный пересказ' : 'полный отчёт'}. Пиши по-русски.`
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
