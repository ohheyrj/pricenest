# Universal Module Export Utilities

This directory contains utilities to make JavaScript modules work across different environments:

- **CommonJS** (Node.js, current usage)
- **ES Modules** (webpack, modern bundlers) 
- **Browser globals** (direct script tags)

## Files

- `universal-export.js` - Standalone universal export utility
- `module-wrapper.js` - More advanced module wrapper with dependency resolution
- `apply-universal-export.js` - Helper templates for applying universal export pattern

## Quick Start

### Option 1: Using the Universal Export Utility

1. Include the universal export utility in your module:
```javascript
// At the end of your module file, replace your existing export code with:
```

2. Or copy the inline pattern used in the updated modules (APIClient, Modal, SearchManager).

### Option 2: Using the Inline Pattern (Recommended)

Copy this code block to the end of any module file:

```javascript
// Export for use in other modules
// Using universal export pattern for CommonJS, ES modules, and browser compatibility
(function() {
    'use strict';
    
    // Universal export function
    function universalExport(moduleExport, globalName) {
        const name = globalName || (moduleExport && moduleExport.name) || 'UnnamedModule';
        
        if (typeof module !== 'undefined' && module.exports) {
            // CommonJS (Node.js, current usage)
            module.exports = moduleExport;
        } else if (typeof define === 'function' && define.amd) {
            // AMD (RequireJS)
            define(name, [], function() {
                return moduleExport;
            });
        } else if (typeof exports !== 'undefined') {
            // ES Modules (webpack, modern bundlers)
            exports[name] = moduleExport;
            exports.__esModule = true;
            exports.default = moduleExport;
        } else {
            // Browser globals (direct script tags)
            const root = (function() {
                if (typeof globalThis !== 'undefined') return globalThis;
                if (typeof window !== 'undefined') return window;
                if (typeof global !== 'undefined') return global;
                if (typeof self !== 'undefined') return self;
                throw new Error('Unable to locate global object');
            })();
            
            root[name] = moduleExport;
        }
        
        return moduleExport;
    }
    
    // Export YourModuleName (replace with your actual module name)
    universalExport(YourModuleName);
})();
```

Replace `YourModuleName` with your actual module/class name.

## How It Works

The universal export pattern detects the current JavaScript environment and exports the module accordingly:

### CommonJS (Current Usage)
```javascript
// Your current code works as-is
const APIClient = require('./api-client');
```

### ES Modules (Webpack)
```javascript
// Both named and default imports work
import APIClient from './api-client';
import { APIClient } from './api-client';
```

### Browser Globals
```javascript
// Module is available on window object
const client = new window.APIClient();
```

## Examples

### Basic Class Export
```javascript
class MyService {
    constructor() {
        this.name = 'MyService';
    }
}

// Apply universal export
universalExport(MyService);
```

### Custom Global Name
```javascript
class APIClient {
    // ... class implementation
}

// Export with custom global name
universalExport(APIClient, 'MyCustomAPIClient');
```

## Already Updated Modules

The following modules have been updated to use the universal export pattern:

- `/src/static/js/api-client.js` - APIClient
- `/src/static/js/components/Modal.js` - Modal  
- `/src/static/js/services/SearchManager.js` - SearchManager

## Migration Guide

### Before (CommonJS only)
```javascript
// Old export code
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MyModule;
}
```

### After (Universal)
```javascript
// New universal export code
(function() {
    'use strict';
    
    function universalExport(moduleExport, globalName) {
        // ... universal export implementation
    }
    
    universalExport(MyModule);
})();
```

## Benefits

1. **Backward Compatibility** - Existing CommonJS usage continues to work
2. **Webpack Support** - Enables ES module imports in webpack builds
3. **Browser Compatibility** - Works with direct script tag inclusion
4. **Future-Proof** - Supports modern module systems while maintaining legacy support

## Testing

You can test that your module works in different environments:

### CommonJS
```javascript
const MyModule = require('./my-module');
console.log(new MyModule());
```

### ES Modules (in webpack)
```javascript
import MyModule from './my-module';
console.log(new MyModule());
```

### Browser Global
```html
<script src="./my-module.js"></script>
<script>
    console.log(new MyModule());
</script>
```

## Next Steps

1. Apply the universal export pattern to remaining modules
2. Test webpack builds to ensure ES module imports work
3. Consider updating your webpack configuration if needed
4. Update any module import statements to use ES module syntax where appropriate