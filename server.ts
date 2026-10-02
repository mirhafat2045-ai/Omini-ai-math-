import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Candidate models in preference order (handles high-demand spikes gracefully)
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

async function generateContentWithFallback(options: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}) {
  if (!ai) {
    throw new Error('Gemini API key is not configured in environment secrets.');
  }

  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.3,
        },
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[OmniMath AI] Model ${model} failed, attempting next candidate. Reason:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate models failed to generate content.');
}

// Clean and normalize messages to ensure valid Gemini turn structure (starts with user, alternates strictly)
function normalizeMessages(messages: { role: string; content: string }[]) {
  const clean = messages.filter(m => m && m.content && m.content.trim().length > 0);
  if (clean.length === 0) {
    return [{ role: 'user' as const, parts: [{ text: 'Hello' }] }];
  }

  // Gemini multi-turn conversation must start with a user message
  while (clean.length > 0 && clean[0].role !== 'user') {
    clean.shift();
  }

  if (clean.length === 0) {
    return [{ role: 'user' as const, parts: [{ text: 'Hello' }] }];
  }

  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const m of clean) {
    const role: 'user' | 'model' = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += '\n\n' + m.content;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }

  return contents;
}

// AI Assistant Chat Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is available.',
      });
    }

    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const systemPrompt = `You are OmniMath AI, an elite mathematics copilot and computational scientific assistant.
You specialize in:
1. Advanced Scientific Computing & Calculus (derivatives, integrals, limits, complex numbers, series)
2. Complex Linear Algebra (matrix decompositions, spectral theory, eigenvalues/eigenvectors, Jordan canonical form, vector spaces, orthogonal projections, inner product spaces)
3. Multivariable Calculus & 3D Surface Analysis (gradient vectors, Hessian matrices, saddle points, critical points, divergence, curl, parametric surfaces)
4. Assisting the user with the active calculator workspace.

CURRENT WORKSPACE CONTEXT:
${context ? JSON.stringify(context, null, 2) : 'No specific active equation.'}

Guidelines:
- Provide rigorous yet clear explanations.
- Always format mathematical expressions in LaTeX using $...$ for inline formulas and $$...$$ for display equations.
- When explaining matrix operations, write out matrices in LaTeX format: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$.
- If the user asks for a 3D function to visualize, always include a JSON block specifying:
\`\`\`json:3d_preset
{
  "name": "Surface Name",
  "func": "mathematical expression for z=f(x, y)",
  "xMin": -5,
  "xMax": 5,
  "yMin": -5,
  "yMax": 5,
  "description": "Short explanation of the geometry"
}
\`\`\`
This allows the client to automatically load and plot the surface in 3D in real-time!
- Keep answers insightful, precise, and supportive.`;

    const formattedContents = normalizeMessages(messages);

    const reply = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction: systemPrompt,
      temperature: 0.3,
    });

    return res.json({ reply });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred during AI processing.',
    });
  }
});

// AI Step-by-Step Problem Solver Endpoint
app.post('/api/ai/solve-steps', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured.',
      });
    }

    const { type, expression, matrixA, matrixB, operation, question } = req.body;

    const prompt = `Solve this mathematical problem step-by-step with extreme rigor and clarity.

Type: ${type || 'general'}
Expression: ${expression || 'N/A'}
Matrix A: ${matrixA ? JSON.stringify(matrixA) : 'N/A'}
Matrix B: ${matrixB ? JSON.stringify(matrixB) : 'N/A'}
Operation: ${operation || 'N/A'}
User Prompt: ${question || 'Please provide step-by-step solution, intermediate steps, verification, and geometric/algebraic significance.'}

Format requirements:
- Use clear numbered steps.
- Use LaTeX $...$ and $$...$$ extensively for all equations and matrices.
- Explain "Why" each step is taken.
- Conclude with the final result in a prominent box or section.`;

    const solution = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: 'You are an advanced mathematical solver providing pedagogical, step-by-step algebraic and calculus derivations.',
      temperature: 0.2,
    });

    return res.json({ solution });
  } catch (error: any) {
    console.error('AI Solver Error:', error);
    return res.status(500).json({ error: error.message || 'Error generating solution.' });
  }
});

// AI 3D Function Analysis Endpoint
app.post('/api/ai/analyze-surface', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const { func, xRange, yRange } = req.body;
    const prompt = `Perform a comprehensive multivariable calculus and geometrical analysis on the 3D surface:
z = f(x, y) = ${func}
Range: x in [${xRange?.[0] ?? -5}, ${xRange?.[1] ?? 5}], y in [${yRange?.[0] ?? -5}, ${yRange?.[1] ?? 5}]

Provide:
1. Partial Derivatives: $\\frac{\\partial z}{\\partial x}$ and $\\frac{\\partial z}{\\partial y}$
2. Gradient Vector: $\\nabla f(x, y)$
3. Critical Points & Second Partial Derivative Test (Hessian Matrix determinant $D = f_{xx}f_{yy} - (f_{xy})^2$)
4. Surface Topology (Saddle points, local extrema, asymptotic behavior, symmetry)
5. Real-World Applications (Physics, engineering, potential energy surfaces, wave propagation)`;

    const analysis = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: 'You are an expert in differential geometry and multivariable calculus.',
      temperature: 0.2,
    });

    return res.json({ analysis });
  } catch (error: any) {
    console.error('AI Surface Analysis Error:', error);
    return res.status(500).json({ error: error.message || 'Error analyzing surface.' });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`OmniMath Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
