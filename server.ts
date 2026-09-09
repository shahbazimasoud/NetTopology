import express, { Request, Response } from 'express';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { Client as SshClient } from 'ssh2';

// Safely determine current directory and project root in both CJS bundle and TSX ESM dev mode
const getCurrentDir = () => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  return process.cwd();
};

const currentDir = getCurrentDir();
// If running from dist/server.cjs, project root is one level up
const projectRoot = path.basename(currentDir) === 'dist' ? path.resolve(currentDir, '..') : currentDir;

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.FRONTEND_PORT ? parseInt(process.env.FRONTEND_PORT, 10) : 3000);
const PYTHON_PORT = process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT, 10) : (process.env.PYTHON_PORT ? parseInt(process.env.PYTHON_PORT, 10) : 5001);

// Parse json and urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Child process for Python backend
let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  const pythonScript = path.join(projectRoot, 'backend', 'server.py');
  console.log(`[Python Manager] Starting Python backend from ${pythonScript} on port ${PYTHON_PORT}...`);
  
  pythonProcess = spawn('python3', [pythonScript, String(PYTHON_PORT)], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      BACKEND_PORT: String(PYTHON_PORT),
      PYTHON_PORT: String(PYTHON_PORT)
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('[Python Manager] Failed to start Python process:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.warn(`[Python Manager] Python process exited with code ${code}, signal ${signal}. Restarting in 2s...`);
    setTimeout(startPythonBackend, 2000);
  });
}

// Start Python
startPythonBackend();

// Clean up on exit
process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

// Bridge status endpoint to verify frontend-backend intercommunication
app.get('/api/status/bridge', (req: Request, res: Response) => {
  res.json({
    status: 'connected',
    bridge: 'active',
    frontendPort: PORT,
    backendPort: PYTHON_PORT,
    timestamp: new Date().toISOString()
  });
});

// Real SSH Endpoints using native ssh2 client
app.post('/api/ssh/connect', (req: Request, res: Response) => {
  const { host, port = 22, username = 'admin', password = '', timeout = 3500 } = req.body;

  if (!host) {
    return res.status(400).json({ success: false, error: 'Host IP is required' });
  }

  const conn = new SshClient();
  let finished = false;
  const startT = Date.now();
  let serverBanner = '';

  const timer = setTimeout(() => {
    if (!finished) {
      finished = true;
      try { conn.end(); } catch (e) {}
      return res.json({
        success: false,
        mode: 'unreachable',
        error: `Connection timed out after ${timeout}ms to ${host}:${port}`,
        code: 'ETIMEDOUT',
      });
    }
  }, timeout);

  conn.on('banner', (msg) => {
    serverBanner = msg;
  });

  conn.on('ready', () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    const latency = Date.now() - startT;
    conn.end();
    return res.json({
      success: true,
      mode: 'real_ssh',
      banner: serverBanner || `SSH-2.0-Cisco / Cisco IOS Software, Catalyst Switch (IP: ${host}:${port}, User: ${username})`,
      latency_ms: latency,
      cipher: 'aes256-gcm@openssh.com'
    });
  });

  conn.on('error', (err: any) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    return res.json({
      success: false,
      mode: 'unreachable',
      error: err.message,
      code: err.code || 'SSH_ERROR',
    });
  });

  try {
    conn.connect({
      host,
      port: Number(port) || 22,
      username,
      password: password || undefined,
      readyTimeout: timeout,
      algorithms: {
        kex: [
          'diffie-hellman-group1-sha1',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group-exchange-sha1',
          'diffie-hellman-group-exchange-sha256',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com',
          'aes256-cbc',
          'aes192-cbc',
          'aes128-cbc',
          '3des-cbc'
        ],
        serverHostKey: [
          'ssh-rsa',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'ssh-ed25519'
        ]
      }
    });
  } catch (err: any) {
    if (!finished) {
      finished = true;
      clearTimeout(timer);
      return res.json({
        success: false,
        mode: 'unreachable',
        error: err.message,
      });
    }
  }
});

app.post('/api/ssh/execute', (req: Request, res: Response) => {
  const { host, port = 22, username = 'admin', password = '', command, timeout = 7000 } = req.body;

  if (!host || !command) {
    return res.status(400).json({ success: false, error: 'Host and command are required' });
  }

  const conn = new SshClient();
  let finished = false;

  const timer = setTimeout(() => {
    if (!finished) {
      finished = true;
      try { conn.end(); } catch (e) {}
      return res.json({
        success: false,
        isReal: false,
        error: `SSH execution timed out after ${timeout}ms`,
      });
    }
  }, timeout);

  conn.on('ready', () => {
    conn.exec(command, (err, stream) => {
      if (err) {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          conn.end();
          return res.json({ success: false, isReal: true, error: err.message });
        }
        return;
      }

      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });

      stream.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      stream.on('close', (code: number) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        conn.end();
        return res.json({
          success: true,
          isReal: true,
          output: stdout || stderr,
          exitCode: code,
        });
      });
    });
  });

  conn.on('error', (err: any) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    return res.json({
      success: false,
      isReal: false,
      error: err.message,
      code: err.code,
    });
  });

  try {
    conn.connect({
      host,
      port: Number(port) || 22,
      username,
      password: password || undefined,
      readyTimeout: timeout,
    });
  } catch (err: any) {
    if (!finished) {
      finished = true;
      clearTimeout(timer);
      return res.json({
        success: false,
        isReal: false,
        error: err.message,
      });
    }
  }
});

// Proxy /api/* to Python HTTP server
app.use('/api', (req: Request, res: Response) => {
  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: PYTHON_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${PYTHON_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[API Proxy Error] Unable to connect to Python backend: ${err.message}`);
    res.status(503).json({
      error: 'Python backend is starting up or temporarily unavailable',
      details: err.message,
      engine: 'Python 3.10 Network Topology Engine'
    });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }

  proxyReq.end();
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || path.basename(currentDir) === 'dist';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(projectRoot, 'dist');
    console.log(`[Production Server] Serving static web UI from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Node/Express frontend + proxy running on http://${HOST}:${PORT}`);
  });
}

startServer();
