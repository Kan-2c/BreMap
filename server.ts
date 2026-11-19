import 'dotenv/config';
import express, {type Request, type Response} from 'express';
import {spawn, type ChildProcess} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const PYTHON_PORT = Number(process.env.PYTHON_BACKEND_PORT || 8001);
const PYTHON_BASE_URL = `http://127.0.0.1:${PYTHON_PORT}`;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let pythonProc: ChildProcess | null = null;

function startPythonBackend(): ChildProcess {
  const proc = spawn('python3', ['-m', 'backend.app'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHON_BACKEND_PORT: String(PYTHON_PORT),
      PYTHONUNBUFFERED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[python] ${chunk.toString()}`);
  });
  proc.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[python] ${chunk.toString()}`);
  });
  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[python] exited unexpectedly with code ${code}`);
    }
  });

  return proc;
}

async function waitForPythonReady(maxAttempts = 25): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await fetch(`${PYTHON_BASE_URL}/api/health`);
      if (resp.ok) {
        return;
      }
    } catch {
      // Waiting for Python HTTP server to bind
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Python backend did not become ready in time.');
}

async function main(): Promise<void> {
  pythonProc = startPythonBackend();
  await waitForPythonReady();

  const app = express();
  app.use(express.json({limit: '4mb'}));

  // Forward all /api/* traffic to the Python geospatial processor
  app.all('/api/*', async (req: Request, res: Response) => {
    try {
      const targetUrl = `${PYTHON_BASE_URL}${req.originalUrl}`;
      const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });

      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
      res.send(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Python backend unavailable';
      res.status(502).json({error: {code: 'BACKEND_UNREACHABLE', message: msg}});
    }
  });

  if (IS_PRODUCTION) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`BreMap gateway listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    if (pythonProc && !pythonProc.killed) {
      pythonProc.kill('SIGTERM');
    }
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start BreMap server:', err);
  if (pythonProc && !pythonProc.killed) {
    pythonProc.kill('SIGTERM');
  }
  process.exit(1);
});
