const fs = require('fs');
const path = require('path');

const IC_STATES = {
    '0': 'UNINITIALIZED',
    '.': 'PREMONOMORPHIC',
    '1': 'MONOMORPHIC',
    'P': 'POLYMORPHIC',
    'N': 'MEGAMORPHIC',
};

const STATE_SEVERITY = {
    'UNINITIALIZED': 0,
    'PREMONOMORPHIC': 1,
    'MONOMORPHIC': 2,
    'POLYMORPHIC': 3,
    'MEGAMORPHIC': 4,
};

function parseState(code) {
    return IC_STATES[code] || null;
}

function analyzer(logFilePath) {
  if (!logFilePath || !fs.existsSync(logFilePath)) {
    console.error(`Log file not found or path is invalid: ${logFilePath}`);
    return [];
  }

  const lines = fs.readFileSync(logFilePath, 'utf-8').split(/\r?\n/);
  const icTypes = new Set(['LoadIC', 'KeyedLoadIC', 'StoreIC', 'KeyedStoreIC']);
  
  const codeBlocks = [];
  lines.forEach(line => {
    if (!line.startsWith('code-creation,JS')) return;

    const parts = line.split(',');
    const startAddress = parseInt(parts[4], 16);
    const codeSize = parseInt(parts[5], 16);
    const fullFunctionAndLocation = parts[6] || '';
    
    if (fullFunctionAndLocation.includes('node:') || !startAddress) return;

    let functionName = '[anonymous]';
    let filePath = '';
    let location = '';
    const firstSpaceIndex = fullFunctionAndLocation.indexOf(' ');

    if (firstSpaceIndex !== -1) {
      functionName = fullFunctionAndLocation.substring(0, firstSpaceIndex).trim();
      const fileAndLocationPart = fullFunctionAndLocation.substring(firstSpaceIndex + 1).trim();
      const lastColonIndex = fileAndLocationPart.lastIndexOf(':');
      const secondLastColonIndex = fileAndLocationPart.lastIndexOf(':', lastColonIndex - 1);

      if (lastColonIndex !== -1 && secondLastColonIndex !== -1) {
        filePath = fileAndLocationPart.substring(0, secondLastColonIndex).trim();
        location = fileAndLocationPart.substring(secondLastColonIndex + 1).trim();
      } else {
        filePath = fileAndLocationPart.trim();
      }
    } else {
      filePath = fullFunctionAndLocation.trim();
    }

    codeBlocks.push({
      functionName: functionName || '[anonymous]',
      file: filePath,
      location: location,
      start: startAddress,
      end: startAddress + codeSize,
      icTransitions: new Map()
    });
  });

  lines.forEach((line, index) => {
    const parts = line.split(',');
    const type = parts[0];

    if (!icTypes.has(type) || parts.length < 9) return;

    const newState = parseState(parts[6]);
    if (!(newState === 'POLYMORPHIC' || newState === 'MEGAMORPHIC')) return;

    const instructionAddress = parseInt(parts[1], 16);
    if (!instructionAddress) return;

    const ownerBlock = codeBlocks.find(block => 
      instructionAddress >= block.start && instructionAddress < block.end
    );

    if (ownerBlock) {
      const oldState = parseState(parts[5]);
      const propertyKey = parts[8] || '[unspecified]';
      const lineNumber = Number(parts[3]);
      const columnNumber = Number(parts[4]);
      const transitionKey = `${type}-${propertyKey}-${lineNumber}-${columnNumber}`;

      const existingTransition = ownerBlock.icTransitions.get(transitionKey);
      if (!existingTransition || STATE_SEVERITY[newState] > STATE_SEVERITY[existingTransition.toState]) {
        ownerBlock.icTransitions.set(transitionKey, { 
          icType: type, 
          property: propertyKey, 
          line: lineNumber, 
          column: columnNumber, 
          fromState: oldState, 
          toState: newState 
        });
      }
    }
  });

  const finalResult = codeBlocks
    .filter(block => block.icTransitions.size > 0)
    .map(block => {
      return {
        functionName: block.functionName,
        file: block.file,
        location: block.location,
        icTransitions: Array.from(block.icTransitions.values())
      };
    });
    
  try {
    const logDir = path.dirname(logFilePath);
    fs.rmSync(logDir, { recursive: true, force: true });
  } catch (cleanupError) {
    console.error(`Failed to cleanup log directory for ${logFilePath}:`, cleanupError);
  }

  return finalResult;
}

module.exports = { analyzer };