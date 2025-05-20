const { generateLog } = require('./lib/generate-log');
const { analyzer } = require('./lib/analyzer');

function morphicAnalyzer(targetFile) {
  return generateLog(targetFile)
      .then((logFile) => analyzer(logFile))
}

module.exports = { morphicAnalyzer };