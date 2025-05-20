# morphic-analyzer

A Node.js library to inspect Inline Cache (IC) state transitions in your JavaScript code using V8 logs.

It detects functions that become `POLYMORPHIC` or `MEGAMORPHIC`, helping you identify potential performance pitfalls in your code.

---

## 📦 Installation

```bash
npm install morphic-analyzer
```

## 🧪 Usage

```javascript
const { morphicAnalyzer } = require('morphic-analyzer');

morphicAnalyzer('./your-script.js').then((results) => {
  console.log(JSON.stringify(results, null, 2));
});
```

## 📋 Example Output

```json
[
  {
    "functionName": "updateUser",
    "file": "src/user.js",
    "location": "42",
    "icTransitions": [
      {
        "icType": "LoadIC",
        "property": "name",
        "line": 43,
        "column": 14,
        "fromState": "MONOMORPHIC",
        "toState": "POLYMORPHIC",
        "transitionLineIndex": 123
      }
    ]
  }
]
```