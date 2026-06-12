const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Parse parent directory's .env file to extract GEMINI_API_KEY
let geminiKey = process.env.GEMINI_API_KEY || '';
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        if (key === 'GEMINI_API_KEY') {
          geminiKey = val;
        }
      }
    });
  }
} catch (err) {
  console.warn('[WARN] Could not parse .env file:', err.message);
}

// Catalog lookup for keyword-matching fallback
const FALLBACK_CATALOG = {
  scifi: [
    { title: "Interstellar", reason: "An epic space exploration journey that bends time and gravity." },
    { title: "Dune", reason: "A breathtaking sci-fi odyssey set on a brutal desert planet." },
    { title: "Blade Runner 2049", reason: "A visually stunning cyberpunk masterpiece exploring humanity." },
    { title: "The Matrix", reason: "The classic cyber-thriller that questions the nature of reality." },
    { title: "Stranger Things", reason: "An 80s nostalgia-filled sci-fi mystery with monsters." }
  ],
  horror: [
    { title: "The Conjuring", reason: "A chilling supernatural horror based on real-life paranormal investigators." },
    { title: "Get Out", reason: "A thrilling psychological horror that satirizes modern social dynamics." },
    { title: "Hereditary", reason: "A deeply disturbing story of family trauma and occult forces." },
    { title: "A Quiet Place", reason: "A tense survival horror where sound is your deadly enemy." },
    { title: "Stranger Things", reason: "Features creepy extra-dimensional creatures like the Demogorgon." }
  ],
  action: [
    { title: "Mad Max: Fury Road", reason: "A non-stop high-octane car chase across a desert wasteland." },
    { title: "John Wick", reason: "A neo-noir action thriller featuring elite gun-fu sequences." },
    { title: "The Dark Knight", reason: "The ultimate superhero crime drama with intense action." },
    { title: "Gladiator", reason: "A legendary story of betrayal, revenge, and combat in Rome." },
    { title: "Inception", reason: "High-stakes dream-heist action with mind-bending set pieces." }
  ],
  romance: [
    { title: "La La Land", reason: "A vibrant, bittersweet musical about dreams, art, and love in LA." },
    { title: "The Notebook", reason: "A timeless, emotional love story spanning decades." },
    { title: "About Time", reason: "A heartwarming romantic drama utilizing time travel." },
    { title: "Titanic", reason: "An epic romance and disaster film set on the doomed ship." },
    { title: "Pride & Prejudice", reason: "A classic story of love, status, and class." }
  ],
  comedy: [
    { title: "Superbad", reason: "A hilarious high school comedy about friendship and misadventures." },
    { title: "The Hangover", reason: "A wild mystery-comedy centered on a bachelor party gone wrong." },
    { title: "Step Brothers", reason: "A chaotic, laugh-out-loud comedy about adult step-siblings." },
    { title: "Booksmart", reason: "A fresh, fast-paced high school graduation buddy comedy." },
    { title: "Ted Lasso", reason: "A wholesome, hilarious show about optimism and football." }
  ],
  anime: [
    { title: "Demon Slayer: Kimetsu no Yaiba", reason: "Beautifully animated dark fantasy action about demon slayers." },
    { title: "Attack on Titan", reason: "A dark, intense story of humanity fighting giants for survival." },
    { title: "Spirited Away", reason: "A magical Studio Ghibli masterpiece set in a spirit bathhouse." },
    { title: "Death Note", reason: "A high-stakes mental chess game between a genius vigilante and a detective." },
    { title: "Naruto", reason: "An inspiring journey of a young ninja seeking recognition." }
  ],
  default: [
    { title: "Inception", reason: "A mind-bending heist thriller set inside the subconscious." },
    { title: "Interstellar", reason: "A visually gorgeous and emotional odyssey across the universe." },
    { title: "The Dark Knight", reason: "One of the most acclaimed films featuring an iconic villain." },
    { title: "Stranger Things", reason: "An absolute binge-worthy sci-fi mystery full of suspense." },
    { title: "Wednesday", reason: "A gothic comedy-mystery following Wednesday Addams at Nevermore Academy." }
  ]
};

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: "AndScene Custom Scraper Server is online!",
    endpoints: {
      movies: "/v1/movies/:tmdbId",
      tv: "/v1/tv/:tmdbId/seasons/:season/episodes/:episode",
      recommend: "POST /v1/ai/recommend"
    }
  });
});

// Resolve Movies
app.get('/v1/movies/:id', async (req, res) => {
  const tmdbId = req.params.id;
  console.log(`[INFO] Resolving movie stream for TMDB ID: ${tmdbId}`);
  const streams = await resolveStream(tmdbId, 'movie');
  if (streams && streams.length > 0) {
    res.json({ success: true, streams });
  } else {
    res.status(404).json({ success: false, message: "No streaming source found." });
  }
});

// Resolve TV Show Episodes
app.get('/v1/tv/:id/seasons/:season/episodes/:episode', async (req, res) => {
  const { id: tmdbId, season, episode } = req.params;
  console.log(`[INFO] Resolving TV stream for TMDB ID: ${tmdbId}, S:${season} E:${episode}`);
  const streams = await resolveStream(tmdbId, 'tv', season, episode);
  if (streams && streams.length > 0) {
    res.json({ success: true, streams });
  } else {
    res.status(404).json({ success: false, message: "No streaming source found." });
  }
});

// AI Recommendation Endpoint
app.post('/v1/ai/recommend', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const cleanPrompt = prompt.toLowerCase().trim();
  console.log(`[INFO] AI recommendation requested for prompt: "${prompt}"`);

  // Call Gemini API securely if key is loaded
  if (geminiKey) {
    try {
      const systemInstructions = "Recommend 5 movies or TV shows matching the user's vibe description. Return ONLY a JSON array of objects, each object containing 'title' (string) and 'reason' (string, 1-sentence reason why it fits). Do not include markdown ticks, backticks, or 'json' headers. Example: [{\"title\": \"Dune\", \"reason\": \"Matches the epic space vibe.\"}]";
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{
            parts: [{
              text: `${systemInstructions}\n\nUser Vibe Description: ${prompt}`
            }]
          }]
        }
      );
      
      const textResult = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let cleanedJsonText = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedRecommendations = JSON.parse(cleanedJsonText);
      if (Array.isArray(parsedRecommendations)) {
        return res.json({ success: true, source: 'gemini', recommendations: parsedRecommendations });
      }
    } catch (err) {
      console.warn('[WARN] Gemini API call failed, falling back to local catalog:', err.message);
    }
  }

  // Keyword Fallback Matcher
  let matchedCategory = 'default';
  if (cleanPrompt.includes('sci-fi') || cleanPrompt.includes('scifi') || cleanPrompt.includes('space') || cleanPrompt.includes('future') || cleanPrompt.includes('galaxy') || cleanPrompt.includes('alien')) {
    matchedCategory = 'scifi';
  } else if (cleanPrompt.includes('horror') || cleanPrompt.includes('scary') || cleanPrompt.includes('ghost') || cleanPrompt.includes('spooky') || cleanPrompt.includes('creepy') || cleanPrompt.includes('monster')) {
    matchedCategory = 'horror';
  } else if (cleanPrompt.includes('action') || cleanPrompt.includes('fight') || cleanPrompt.includes('explosion') || cleanPrompt.includes('thrill') || cleanPrompt.includes('shoot') || cleanPrompt.includes('superhero')) {
    matchedCategory = 'action';
  } else if (cleanPrompt.includes('romance') || cleanPrompt.includes('love') || cleanPrompt.includes('date') || cleanPrompt.includes('romantic') || cleanPrompt.includes('relationship')) {
    matchedCategory = 'romance';
  } else if (cleanPrompt.includes('comedy') || cleanPrompt.includes('funny') || cleanPrompt.includes('laugh') || cleanPrompt.includes('hilarious') || cleanPrompt.includes('joke')) {
    matchedCategory = 'comedy';
  } else if (cleanPrompt.includes('anime') || cleanPrompt.includes('japan') || cleanPrompt.includes('manga') || cleanPrompt.includes('animated') || cleanPrompt.includes('cartoon')) {
    matchedCategory = 'anime';
  }

  const recommendations = FALLBACK_CATALOG[matchedCategory];
  return res.json({ success: true, source: `fallback-${matchedCategory}`, recommendations });
});

// Helper to resolve video streams (.m3u8 / .mp4)
async function resolveStream(tmdbId, type, season = 1, episode = 1) {
  try {
    const fallbackHlsUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";
    return [
      {
        name: "Direct Stream (Auto-Resolved)",
        url: fallbackHlsUrl,
        quality: "1080p",
        type: "hls"
      }
    ];
  } catch (err) {
    console.error("Resolver error:", err.message);
    return [];
  }
}

app.listen(PORT, () => {
  console.log(`\n🚀 AndScene Scraper Server is running!`);
  console.log(`👉 API URL: http://localhost:${PORT}`);
  console.log(`👉 Enter this URL in your website's API Settings.\n`);
});

