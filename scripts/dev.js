import { spawn, spawnSync } from 'node:child_process';

const DEV_PORTS = [5000, 5173];

function cleanupDevPorts() {
  if (process.platform !== 'win32') return;

  const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
  if (result.error || !result.stdout) return;

  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue;
    const columns = line.trim().split(/\s+/);
    const localAddress = columns[1] || '';
    const pid = columns[columns.length - 1];
    if (DEV_PORTS.some(port => localAddress.endsWith(`:${port}`)) && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { stdio: 'ignore' });
  }
}

cleanupDevPorts();

const commands = [
  { name: 'backend', command: 'npm --prefix backend run dev' },
  { name: 'frontend', command: 'npm run dev:frontend' },
];

const children = commands.map(({ name, command }) => {
  const child = spawn(command, {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    detached: process.platform !== 'win32',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] stopped with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

function shutdown(code = 0) {
  for (const child of children) {
    if (child.killed) continue;

    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
