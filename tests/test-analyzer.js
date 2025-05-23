const path = require('path');
const fs = require('fs');
const { analyzer } = require('../lib/analyzer');

function createFixtures() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir);
  }

  const emptyLogPath = path.join(fixturesDir, 'empty.log');
  fs.writeFileSync(emptyLogPath, '');

  const simpleLogPath = path.join(fixturesDir, 'simple.log');
  const simpleLogContent = [
    'code-creation,JS,10,167695,0x2274a803f046,62,averageNumberOfWheels examples/megamorphic-real.js:42:31,0x2274a803b858,~',
    'LoadIC,0x2274a803f063,167832,50,28,0,1,0x2274a803e221,wheels,,',
    'LoadIC,0x2274a803f063,167842,50,28,1,P,0x2274a803e3e9,wheels,,',
    'LoadIC,0x2274a803f063,167849,50,28,P,P,0x2274a803e551,wheels,,',
    'LoadIC,0x2274a803f063,167865,50,28,P,P,0x2274a803df11,wheels,,',
    'LoadIC,0x2274a803f063,167873,50,28,P,N,0x2274a803e079,wheels,,'
  ].join('\n');
  fs.writeFileSync(simpleLogPath, simpleLogContent);
}

function assertEqual(current, expected, message = '') { 
  const result = JSON.stringify(current) === JSON.stringify(expected);

  console.log(result ? `✅ ${message}` : `❌ ${message}`);

  if (!result) {
    console.error("Expected:");
    console.error(JSON.stringify(expected));
    console.error("Got:");
    console.error(JSON.stringify(current));
  }
}

function testEmptyLog() {
  const logFilePath = path.join(__dirname, 'fixtures', 'empty.log');
  const result = analyzer(logFilePath);
  assertEqual(result, [], 'Empty log file should return an empty array');
}

function testSimpleLog() {
  const logFilePath = path.join(__dirname, 'fixtures', 'simple.log');
  const result = analyzer(logFilePath);
  const expected = [
    {
      functionName: 'averageNumberOfWheels examples/megamorphic-real.js:42:31',
      file: '',
      location: '',
      icTransitions: [
        {
          icType: 'LoadIC',
          property: 'wheels',
          line: 50,
          column: 28,
          fromState: 'MONOMORPHIC',
          toState: 'POLYMORPHIC',
          transitionLineIndex: 2
        },
        {
          icType: 'LoadIC',
          property: 'wheels',
          line: 50,
          column: 28,
          fromState: 'POLYMORPHIC',
          toState: 'POLYMORPHIC',
          transitionLineIndex: 3
        },
        {
          icType: 'LoadIC',
          property: 'wheels',
          line: 50,
          column: 28,
          fromState: 'POLYMORPHIC',
          toState: 'POLYMORPHIC',
          transitionLineIndex: 4
        },
        {
          icType: 'LoadIC',
          property: 'wheels',
          line: 50,
          column: 28,
          fromState: 'POLYMORPHIC',
          toState: 'MEGAMORPHIC',
          transitionLineIndex: 5
        }
      ]
    }
  ];
  assertEqual(result, expected, 'Simple log file should return the correct analysis');
}

createFixtures();
testEmptyLog();
testSimpleLog();