const fs = require('fs');

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
    const icTypes = ['LoadIC', 'KeyedLoadIC', 'StoreIC', 'KeyedStoreIC'];

    let currentCodeBlock = null;
    const codeBlocks = [];

    lines.forEach((line, index) => {
        if (line.startsWith('code-creation,JS')) {
            const parts = line.split(',');
            const functionNameAndPath = parts[6] || '';
            const [functionName, fileInfo] = functionNameAndPath.split(' /');
            const [filePath, location] = fileInfo ? fileInfo.split(':') : [null, null];

            if (functionName && functionName.includes('node:')) {
                currentCodeBlock = null;
                return;
            }

            currentCodeBlock = {
                functionName: functionName?.trim() || '[anonymous]',
                file: filePath?.trim() || '',
                location: location ? location.trim() : '',
                icTransitions: []
            };
            codeBlocks.push(currentCodeBlock);
            return;
        }

        const parts = line.split(',');
        const type = parts[0];

        if (!icTypes.includes(type) || parts.length < 9) return;

        const newStateCode = parts[6];
        const newState = parseState(newStateCode);

        if (!(newState === 'POLYMORPHIC' || newState === 'MEGAMORPHIC')) return;

        const oldStateCode = parts[5];
        const oldState = parseState(oldStateCode);
        const propertyKey = parts[8] || '[unspecified]';
        const lineNumber = parts[3];
        const columnNumber = parts[4];

        if (currentCodeBlock) {
            currentCodeBlock.icTransitions.push({
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

    const filtered = codeBlocks.filter(block => block.icTransitions.length > 0)

    fs.unlinkSync(logFilePath);

    return filtered;
}

module.exports = { analyzer };