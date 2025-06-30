const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function generateLog(targetFile, additionalArgs = []) {
    return new Promise((resolve, reject) => {
        const baseName = path.basename(targetFile, '.js');
        const logDir = path.resolve(__dirname, '../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const isolateLogFile = path.join(logDir, `${baseName}-v8.log`);

        const v8Flags = [
            '--log',
            `--logfile=${isolateLogFile}`,
            '--log-deopt',
            '--log-ic'
        ];

        const child = spawn(process.execPath, [...v8Flags, targetFile, additionalArgs], {
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            const files = fs.readdirSync(logDir)
                .map(file => path.join(logDir, file))
                .sort((a, b) => fs.statSync(a).mtime - fs.statSync(b).mtime);

            const latestLogFile = files[files.length - 1];
            resolve(latestLogFile);
        });
    });
}

module.exports = { generateLog };