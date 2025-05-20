const fs = require('fs');
const path = require('path');

// IC States
const IC_STATES = {
    '0': 'UNINITIALIZED',
    '.': 'PREMONOMORPHIC',
    '1': 'MONOMORPHIC',
    'P': 'POLYMORPHIC',
    'N': 'MEGAMORPHIC',
};

function parseState(code) {
    return IC_STATES[code] || null;
}

function analyzer(logFilePath) {
    if (!fs.existsSync(logFilePath)) {
        console.error(`File not found: ${logFilePath}`);
        process.exit(1);
    }

    const lines = fs.readFileSync(logFilePath, 'utf-8').split(/\r?\n/);

    // Pass 1: Map code-creation blocks
    const codeBlocks = []; // { lineIndex, address, functionName, file, location }
    lines.forEach((line, index) => {
        if (line.startsWith('code-creation,JS')) {
            const parts = line.split(',');
            const address = parts[4];
            const functionNameAndPath = parts[6] || '';
            const [functionName, fileInfo] = functionNameAndPath.split(' /');
            const [filePath, location] = fileInfo ? fileInfo.split(':') : [null, null];

            codeBlocks.push({
                lineIndex: index,
                address,
                functionName: functionName?.trim() || '[anonymous]',
                file: filePath?.trim() || '',
                location: location ? location.trim() : '',
                icEvents: []
            });
        }
    });

    // Pass 2: Walk through IC events and associate them
    const icTypes = ['LoadIC', 'KeyedLoadIC', 'StoreIC', 'KeyedStoreIC'];
    lines.forEach((line, index) => {
        const parts = line.split(',');
        const type = parts[0];

        if (!icTypes.includes(type) || parts.length < 9) return;

        const newStateCode = parts[6];
        const newState = parseState(newStateCode);

        // filter: only include IC events with newState === POLYMORPHIC or MEGAMORPHIC
        if (!(newState === 'POLYMORPHIC' || newState === 'MEGAMORPHIC')) return;

        const oldStateCode = parts[5];
        const oldState = parseState(oldStateCode);
        const propertyKey = parts[8] || '[unspecified]';
        const lineNumber = parts[3];
        const columnNumber = parts[4];

        // Find nearest code-creation block above this line
        const contextBlock = [...codeBlocks].reverse().find(cb => cb.lineIndex < index);

        if (contextBlock) {
            contextBlock.icEvents.push({
                icType: type,
                property: propertyKey,
                line: Number(lineNumber),
                column: Number(columnNumber),
                fromState: oldState,
                toState: newState,
                transitionLineIndex: index,
            });
        }
    });

    // Prepare final output: only blocks that had transitions
    const filtered = codeBlocks
        .filter(block => 
            block.icEvents.length > 0 &&
            !(block.functionName.includes('node:'))
        )
        .map(block => ({
            functionName: block.functionName,
            file: block.file,
            location: block.location,
            icTransitions: block.icEvents
        }));

    fs.unlinkSync(logFilePath);

    return filtered;
}

module.exports = { analyzer };