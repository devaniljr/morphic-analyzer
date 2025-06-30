const { generateLog } = require('./lib/generate-log');
const { analyzer } = require('./lib/analyzer');

function morphicAnalyzer(targetFile, additionalArgs = []) {
  return generateLog(targetFile, additionalArgs)
      .then((logFile) => analyzer(logFile))
}

module.exports = { morphicAnalyzer };