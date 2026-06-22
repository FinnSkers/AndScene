const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export async function generateAISummary(title, isTvSeries) {
  console.log('AI Key present?', !!OPENROUTER_API_KEY);
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
      model: 'google/gemma-4-31b-it:free',
      messages: [
        { role: 'system', content: 'You are a passionate film and TV buff. Keep responses extremely concise (3 sentences max), energetic, and avoid major spoilers.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('OpenRouter Error:', response.status, text);
    throw new Error(`Failed to fetch AI summary: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateVibeSearch(query) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured.');
  }

  const prompt = `The user is searching for movies or TV shows with the following "vibe" or description: "${query}".
Return a strict JSON array of 4 exact TMDB titles that match this vibe along with a short reason for each. Only return the JSON array, nothing else. Example: [{"title": "The Matrix", "reason": "A mind-bending sci-fi classic."}]`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'AndScene',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it:free',
      messages: [
        { role: 'system', content: 'You are an expert movie recommendation engine. Only output a valid JSON array of objects with "title" and "reason" keys. No markdown formatting, no code blocks.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch vibe search');
  }

  const data = await response.json();
  try {
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    const recommendations = JSON.parse(content);
    return Array.isArray(recommendations) ? recommendations : [];
  } catch (err) {
    console.error('Failed to parse AI response:', data.choices[0].message.content);
    return [];
  }
}
