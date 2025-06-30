const fs = require('fs');

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

            if (functionNameAndPath.includes('node:')) {
                currentCodeBlock = null;
                return;
            }

            const firstSpaceIndex = functionNameAndPath.indexOf(' ');
            let functionName = functionNameAndPath;
            let fileInfo = '';

            if (firstSpaceIndex !== -1) {
                functionName = functionNameAndPath.substring(0, firstSpaceIndex);
                fileInfo = functionNameAndPath.substring(firstSpaceIndex + 1);
            }
            
            let filePath = '';
            let finalLocation = '';

            if (fileInfo && fileInfo.includes(':')) {
                const partsOfFileLocation = fileInfo.split(':');
                if (partsOfFileLocation.length >= 3) {
                    filePath = partsOfFileLocation.slice(0, partsOfFileLocation.length - 2).join(':');
                    finalLocation = `${partsOfFileLocation[partsOfFileLocation.length - 2]}:${partsOfFileLocation[partsOfFileLocation.length - 1]}`;
                } else if (partsOfFileLocation.length === 2) {
                    filePath = partsOfFileLocation[0];
                    finalLocation = partsOfFileLocation[1];
                } else {
                    filePath = partsOfFileLocation[0];
                }
            } else if (fileInfo) {
                filePath = fileInfo;
            }

            currentCodeBlock = {
                functionName: functionName.trim() || '[anonymous]',
                file: filePath.trim() || '',
                location: finalLocation.trim() || '',
                icTransitions: new Map()
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
        const lineNumber = Number(parts[3]);
        const columnNumber = Number(parts[4]);

        if (currentCodeBlock) {
            const key = `${type}-${propertyKey}-${lineNumber}-${columnNumber}`;

            const existingTransition = currentCodeBlock.icTransitions.get(key);

            if (!existingTransition || STATE_SEVERITY[newState] > STATE_SEVERITY[existingTransition.toState]) {
                currentCodeBlock.icTransitions.set(key, {
                    icType: type,
                    property: propertyKey,
                    line: lineNumber,
                    column: columnNumber,
                    fromState: oldState,
                    toState: newState,
                    transitionLineIndex: index,
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

    fs.unlinkSync(logFilePath);

    return finalResult;
}

module.exports = { analyzer };