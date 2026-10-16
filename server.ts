import 'dotenv/config';
import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PYTHON_PORT = Number(process.env.PYTHON_PORT) || 5001;
const PYTHON_COMMAND = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

// 1. Supervise Python Backend Server
let pythonProcess: ChildProcess | null = null;
let isShuttingDown = false;

function startPythonBackend() {
  console.log(`[Runner] Starting MY-SLOT Python Backend on port ${PYTHON_PORT} with ${PYTHON_COMMAND}`);
  pythonProcess = spawn(PYTHON_COMMAND, [path.join(__dirname, 'backend', 'server.py')], {
    env: {
      ...process.env,
      PYTHON_PORT: String(PYTHON_PORT),
    },
    stdio: 'inherit',
  });

  pythonProcess.on('error', (err) => {
    console.error('[Runner] Failed to start Python backend:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    console.warn(`[Runner] Python backend process exited with code ${code}, signal ${signal}. Restarting in 2s...`);
    setTimeout(startPythonBackend, 2000);
  });
}

startPythonBackend();

// Graceful exit
process.on('SIGINT', () => {
  isShuttingDown = true;
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  isShuttingDown = true;
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

// Parse JSON and raw bodies for Express API forwarding
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Proxy API requests to Python Backend
app.use('/api', async (req, res) => {
  const targetUrl = `http://127.0.0.1:${PYTHON_PORT}/api${req.url}`;

  const headers: Record<string, string> = {};
  const hopByHopHeaders = new Set([
    'host',
    'content-length',
    'transfer-encoding',
    'connection',
  ]);
  for (const [key, value] of Object.entries(req.headers)) {
    if (!hopByHopHeaders.has(key.toLowerCase()) && typeof value === 'string') {
      headers[key] = value;
    }
  }

  const options: RequestInit = {
    method: req.method,
    headers,
  };

  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    options.body = JSON.stringify(req.body);
    headers['content-type'] = 'application/json';
  }

  // Retry only safe methods; a write may have committed even if its response was lost.
  let attempts = 0;
  const maxAttempts = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? 3 : 1;
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(targetUrl, options);
      res.status(response.status);
      
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('content-type', contentType);
      }

      for (const header of [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers',
        'access-control-allow-credentials',
        'access-control-expose-headers',
        'access-control-max-age',
        'vary',
      ]) {
        const value = response.headers.get(header);
        if (value) {
          res.setHeader(header, value);
        }
      }

      const data = await response.text();
      return res.send(data);
    } catch (err: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        return res.status(503).json({
          error: 'Python backend is temporarily initializing. Please try again shortly.',
          details: err?.message,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
});

// 3. Vite Middlewares (Dev) or Static Serving (Prod)
async function startApp() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MY-SLOT Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startApp().catch((err) => {
  console.error('[MY-SLOT Server] Failed to start:', err);
});
