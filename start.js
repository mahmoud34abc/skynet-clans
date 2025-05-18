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

const restartDelay = 3000; //1 second
var stopRestarting = false;

const processes = {}

async function spawnScript(filePath) {
  const scriptName = basename(filePath);
  
  console.log(`Starting script: ${scriptName}`);
  
  const child = spawn('node', [filePath], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, CHILD_SCRIPT: 'true' }
  });

  // Store process info
  processes[scriptName] = {
    child: child,
    filePath: filePath,
    restarts: 0,
    scriptName: scriptName,
    pid: child.pid
  }

  //Handle different child stuff

  child.stdout.on('data', (data) => {
      process.stdout.write(data);
  });

  // Still show errors
  child.stderr.pipe(process.stderr);

  child.on('error', (err) => {
    console.error(`Error in ${scriptName}:`, err);
    scheduleRestart(processes[scriptName]);
  });

  child.on('exit', (code, signal) => {
    console.log(`Script ${scriptName} exited with code ${code} (signal: ${signal})`);
    
    scheduleRestart(processes[scriptName]);
    //if (code !== 0) { // Only restart if non-clean exit
      
    //} else {
    //  processes.delete(child.scriptName);
    //}
  });

  child.on('message', (message) => {
    //console.log("Recieved a message")
    // Broadcast to all other processes
    for (let i = 0; i < message.length; i++) {
      var actualMessage = message[i]
      var scriptToSendTo = actualMessage.MessageTo
      //console.log(scriptToSendTo)
      //console.log(processes)

      if (!scriptToSendTo) return
      var info = processes[scriptToSendTo]
      if (!info) return

      if (info.pid !== child.pid) {
        // Get the actual child process reference
        var otherChild = info?.child;
        if (otherChild && otherChild.connected) {
          otherChild.send(actualMessage);
          //console.log(`Forwarded to ${info.scriptName}`);
        } else {
          function retrySendingMessage() {
            var otherChild = info?.child;
            if (otherChild && otherChild.connected) {
              otherChild.send(actualMessage);
              //console.log(`Forwarded to ${info.scriptName}`);
            } else {
              console.log("Not connected, retrying later..")
              setTimeout(retrySendingMessage, restartDelay)
            }
          }
          setTimeout(retrySendingMessage, restartDelay)
        }
      }
    }
  });
}

async function scheduleRestart(child) {
  if (!child) return;
  if (stopRestarting) return;

  child.restarts++;
  console.log(`Restarting ${child.scriptName} (attempt ${child.restarts}) in ${restartDelay}ms`);
  
  setTimeout(() => {
    processes[child.scriptName] = null
    spawnScript(child.filePath);
  }, restartDelay);
}

async function startAllScripts() {
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
  stopRestarting = true;
  console.log('Parent process exiting - cleaning up child processes');

  for (const [scriptName, info] of Object.entries(processes)) {
    try {
      // Check if process still exists before killing
      process.kill(processes[scriptName].pid, 0); // Signal 0 checks process existence
      process.kill(processes[scriptName].pid); // Actually kill if it exists
    } catch (e) {
      if (e.code === 'ESRCH') {
        console.log(`Process ${scriptName} already dead`);
      } else {
        console.error(`Error killing process ${scriptName}:`, e);
      }
    }
  };
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT - shutting down');
  process.exit();
});

// Start the system
startAllScripts();