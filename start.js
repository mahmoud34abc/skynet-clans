import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const { spawn, execSync, exec } = require('child_process');
require('dotenv').config(); //loading env

import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const codeFolder = join(__dirname, 'code');

const shouldRunNgrok = process.env.USENGROK == "TRUE";
const platform = process.env.PLATFORM
var port = process.env.PORT 
if (port == null || port == undefined) {
  port = 3000
}

const restartDelay = 500; //500ms
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
      //console.log("Forwarding to " + scriptToSendTo)
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
              //console.log("Not connected, retrying later..")
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


var ngrok
async function startNgrok() {
  if (shouldRunNgrok) {
    //Start ngrok

    switch(platform) {
      case "Windows":
        ngrok = spawn('ngrokwin', ['http','--url=moccasin-caring-ladybird.ngrok-free.app', port, '--pooling-enabled'])
      break;
      
      case "Linux": 
        spawn('chmod', ['u+x', './ngrok'])
        ngrok = spawn('./ngrok', ['http','--url=moccasin-caring-ladybird.ngrok-free.app', port, '--pooling-enabled'])
      break;
    }

    
    ngrok.stdout.on('data', (data) => {
      console.log(`Output: ${data}`);
    });

    ngrok.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    ngrok.on('close', (code) => {
      console.log(`Process exited with code ${code}`);
    });
  }
}

// Handle parent process exit
process.on('exit', () => {
  stopRestarting = true;
  console.log('Parent process exiting - cleaning up child processes');

  try {
    process.kill(ngrok.pid, 0);
    process.kill(ngrok.pid);
  } catch (e) {
    if (e.code === 'ESRCH') {
      console.log(`Process ngrok already dead`);
    } else {
      console.error(`Error killing process ${scriptName}:`, e);
    }
  }
  

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
startNgrok()