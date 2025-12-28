import { spawn } from 'child_process';
import path from 'path';

// Spawn node server.js as a detached background process and exit immediately
const serverPath = path.resolve(process.cwd(), 'server.js');
const child = spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: 'ignore',
  cwd: process.cwd()
});

child.unref();
console.log('Server started in background (detached). PID:', child.pid);
