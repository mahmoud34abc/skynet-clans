import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config(); //loading env

import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const codeFolder = join(__dirname, 'code');

const restartDelay = 1000; //1 second
var stopRestarting = false;

const processes = new Map();

function scheduleRestart(child) {
  const processInfo = processes.get(child.pid);
  
  if (!processInfo) return;
  if (stopRestarting) return;

  processInfo.restarts++;
  console.log(`Restarting ${processInfo.scriptName} (attempt ${processInfo.restarts}) in ${restartDelay}ms`);
  
  setTimeout(() => {
    spawnScript(processInfo.filePath);
    processes.delete(child.pid);
  }, restartDelay);
}

function spawnScript(filePath) {
  const scriptName = basename(filePath);
  
  console.log(`Starting script: ${scriptName}`);
  
  const child = spawn('node', [filePath], {
    stdio: 'inherit', // Share stdio with parent
    env: { ...process.env, CHILD_SCRIPT: 'true' }
  });

  // Store process info
  processes.set(child.pid, {
    filePath,
    restarts: 0,
    scriptName
  });

  child.on('error', (err) => {
    console.error(`Error in ${scriptName}:`, err);
    scheduleRestart(child);
  });

  child.on('exit', (code, signal) => {
    console.log(`Script ${scriptName} exited with code ${code} (signal: ${signal})`);
    
    if (code !== 0) { // Only restart if non-clean exit
      scheduleRestart(child);
    } else {
      processes.delete(child.pid);
    }
  });
}

function startAllScripts() {
  // Read all .js files in the scripts folder
  fs.readdir(codeFolder, (err, files) => {
    if (err) {
      console.error('Error reading scripts folder:', err);
      return;
    }

    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = join(codeFolder, file);
        spawnScript(filePath);
      }
    });
  });
}

// Handle parent process exit
process.on('exit', () => {
  console.log('Parent process exiting - cleaning up child processes');
  processes.forEach((info, pid) => {
    try {
      // Check if process still exists before killing
      process.kill(pid, 0); // Signal 0 checks process existence
      process.kill(pid); // Actually kill if it exists
    } catch (e) {
      if (e.code === 'ESRCH') {
        console.log(`Process ${pid} already dead`);
      } else {
        console.error(`Error killing process ${pid}:`, e);
      }
    }
  });
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT - shutting down');
  process.exit();
});

// Start the system
startAllScripts();