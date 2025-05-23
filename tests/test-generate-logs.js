const path = require('path');
const fs = require('fs');
const { generateLog } = require('../lib/generate-log');

async function testGenerateLog() {
  const testFile = path.join(__dirname, 'fixtures', 'dummy.js');

  const code = `function foo() { return 42; } foo();`;
  fs.mkdirSync(path.dirname(testFile), { recursive: true });
  fs.writeFileSync(testFile, code);

  const logFilePath = await generateLog(testFile);

  const exists = fs.existsSync(logFilePath);
  const content = fs.readFileSync(logFilePath, 'utf-8');

  console.log(exists && content.length > 0
    ? '✅ Log file was created and is not empty'
    : '❌ Log file was not created or is empty');

  fs.unlinkSync(testFile);
  fs.unlinkSync(logFilePath);
}

testGenerateLog();
