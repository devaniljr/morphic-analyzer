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
            const fullFunctionInfo = parts[6] || '';
            
            const lastSpaceIndex = fullFunctionInfo.lastIndexOf(' ');
            let functionName = fullFunctionInfo;
            let fileInfo = '';
            if (lastSpaceIndex !== -1) {
                functionName = fullFunctionInfo.substring(0, lastSpaceIndex).trim();
                fileInfo = fullFunctionInfo.substring(lastSpaceIndex + 1).trim();
            }

            let filePath = '';
            let lineNumber = null;
            let columnNumber = null;

            if (fileInfo) {
                const partsOfFileInfo = fileInfo.split(':');
                if (partsOfFileInfo.length >= 3) {
                    columnNumber = partsOfFileInfo.pop(); 
                    lineNumber = partsOfFileInfo.pop();   
                    filePath = partsOfFileInfo.join(':'); 
                } else if (partsOfFileInfo.length === 2) {
                    lineNumber = partsOfFileInfo.pop();
                    filePath = partsOfFileInfo.join(':');
                } else {
                    filePath = partsOfFileInfo.join(':');
                }
            }
            
            if (functionName.includes('node:')) {
                currentCodeBlock = null;
                return;
            }
            
            currentCodeBlock = {
                functionName: functionName || '[anonymous]',
                file: filePath || '',
                location: `${lineNumber || ''}:${columnNumber || ''}`,
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