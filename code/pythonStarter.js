import { createRequire } from 'module';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error('stderr:', stderr);
    }
    //console.log('stdout:', stdout);
  } catch (error) {
    console.error('Command failed:', error.message);
  }
}

var array = [
   'py -m pip install discord.py',
   'py -m pip install dotenv',
]

for (let i = 0; i < array.length; i++) {
   runCommand(array[i]);
}

const pythonProcess = spawn('py', ['./code/Python/bot.py']);

pythonProcess.stdout.on('data', (data) => {
   console.log(`Output: ${data}`);
});

pythonProcess.stderr.on('data', (data) => {
   console.error(`Error: ${data}`);
});

pythonProcess.on('close', (code) => {
   console.log(`Python process exited with code ${code}`);
});