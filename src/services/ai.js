const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export async function generateAISummary(title, isTvSeries) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured.');
  }

  const prompt = isTvSeries 
    ? `Write a fun, spoiler-free, 3-sentence recap of the general premise and early seasons of the TV show "${title}" to get someone excited to watch it again.`
    : `Write a fun, spoiler-free, 3-sentence hook and premise summary for the movie "${title}".`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.href, // Required by OpenRouter
      'X-Title': 'AndScene', // Optional
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash:free',
      messages: [
        { role: 'system', content: 'You are a passionate film and TV buff. Keep responses extremely concise (3 sentences max), energetic, and avoid major spoilers.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch AI summary');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
