import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper to initialize GoogleGenAI safely with correct headers
  function getGeminiClient(): GoogleGenAI | null {
    if (!process.env.GEMINI_API_KEY) return null;
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Wrapper for Gemini API with retry logic for 503s
  async function generateWithRetry(ai: GoogleGenAI, request: any, maxRetries = 2) {
    let attempt = 0;
    while (true) {
      try {
        return await ai.models.generateContent(request);
      } catch (err: any) {
        const isUnavailable = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE');
        if (isUnavailable && attempt < maxRetries) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  // Language mapping helper for public translation fallback
  const LANGUAGE_MAP: Record<string, string> = {
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Japanese': 'ja',
    'Chinese': 'zh-CN',
    'Chinese (Simplified)': 'zh-CN',
    'Korean': 'ko',
    'Hindi': 'hi',
    'Arabic': 'ar',
    'Russian': 'ru',
    'Dutch': 'nl',
    'Polish': 'pl',
    'Turkish': 'tr',
    'Swedish': 'sv',
  };

  // Fallback public translator (splits paragraphs to stay within query limits)
  async function fallbackTranslate(text: string, targetLang: string): Promise<string> {
    const langCode = LANGUAGE_MAP[targetLang] || 'es';
    const paragraphs = text.split('\n');
    const translatedParagraphs: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        translatedParagraphs.push('');
        continue;
      }

      try {
        // Split long paragraphs if necessary (> 400 chars)
        const chunks: string[] = [];
        let cur = '';
        for (const sentence of paragraph.split(/(?<=[.!?。！？])\s+/)) {
          if ((cur + ' ' + sentence).length > 400 && cur) {
            chunks.push(cur);
            cur = sentence;
          } else {
            cur = cur ? cur + ' ' + sentence : sentence;
          }
        }
        if (cur) chunks.push(cur);

        const translatedChunks: string[] = [];
        for (const chunk of chunks) {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${langCode}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data?.responseData?.translatedText) {
            translatedChunks.push(data.responseData.translatedText);
          } else {
            translatedChunks.push(chunk);
          }
        }
        translatedParagraphs.push(translatedChunks.join(' '));
      } catch (err) {
        console.warn('Fallback translate chunk failed:', err);
        translatedParagraphs.push(paragraph);
      }
    }

    return translatedParagraphs.join('\n');
  }

  // Simple API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Journal API' });
  });

  // Reverse Geocoding Proxy to bypass browser CORS / User-Agent blocks
  app.get('/api/location', async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(400).json({ error: 'lat and lon are required' });
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: {
          'User-Agent': 'JournalApp/1.0 (radhashankar38@gmail.com)',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Reverse Geocoding Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch location' });
    }
  });

  // --- User Activity & Streaks Logic Layer ---
  // In a production app, this would be backed by Postgres (e.g., users.streak_count)
  const userActivityMap = new Map<string, { streakCount: number, lastMomentDate: string }>();

  app.post('/api/moments/track', express.json(), (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'User ID required' });
      
      const today = new Date().toISOString().split('T')[0];
      let activity = userActivityMap.get(userId) || { streakCount: 0, lastMomentDate: '' };
      
      if (activity.lastMomentDate !== today) {
        if (activity.lastMomentDate) {
          const lastDate = new Date(activity.lastMomentDate);
          const currentDate = new Date(today);
          const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            activity.streakCount += 1;
          } else if (diffDays > 1) {
            activity.streakCount = 1;
          }
        } else {
          activity.streakCount = 1;
        }
        activity.lastMomentDate = today;
        userActivityMap.set(userId, activity);
      }
      
      res.json(activity);
    } catch (error) {
      console.error('Streak Tracking Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/users/:userId/streak', (req, res) => {
    try {
      const { userId } = req.params;
      const activity = userActivityMap.get(userId) || { streakCount: 0, lastMomentDate: '' };
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  // -------------------------------------------

  // AI Reflection Endpoint
  app.post('/api/reflect', async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const ai = getGeminiClient();
      if (ai) {
        try {
          const prompt = `Analyze the following journal entry. As an empathetic AI reflection companion, generate 3 thoughtful, profound questions to help the writer reflect deeper on their experience (e.g., What did you learn? Would you do it differently? What advice would you give your past self?). Keep the questions concise, warm, and insightful.\n\nJournal:\n"${content}"\n\nQuestions:`;

          const response = await generateWithRetry(ai, {
            model: 'gemini-3.7-flash',
            contents: prompt,
          });

          if (response.text) {
            return res.json({ questions: response.text });
          }
        } catch (genErr: any) {
          console.warn('Gemini generation error, using fallback reflection:', genErr?.message || 'Unknown error');
        }
      }

      // Friendly fallback reflections
      const fallbackQuestions = 
        `1. What emotions stood out to you most while writing this entry, and what triggered them?\n` +
        `2. Looking back at this moment from five years in the future, what wisdom will you have gained?\n` +
        `3. What is one gentle step or positive intention you'd like to take forward from here?`;

      res.json({ questions: fallbackQuestions });
    } catch (error) {
      console.error('AI Reflection Error:', error);
      res.json({ 
        questions: "1. What was the most meaningful lesson in this experience?\n2. How did this shape your perspective?\n3. What are you most grateful for today?" 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
