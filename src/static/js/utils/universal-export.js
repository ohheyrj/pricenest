/**
 * Universal Export Utility
 * A simple utility that allows modules to work in CommonJS, ES modules, and browser environments
 * 
 * @module UniversalExport
 */

/**
 * Exports a module in a way that works across different environments
 * 
 * @param {*} moduleExport - The module/class/function to export
 * @param {string} [globalName] - Optional name for global assignment (defaults to moduleExport.name)
 * 
 * @example
 * // At the end of your module file:
 * universalExport(APIClient);
 * 
 * @example
 * // With custom global name:
 * universalExport(APIClient, 'MyAPIClient');
 */
function universalExport(moduleExport, globalName) {
    'use strict';
    
    // Determine the global name
    const name = globalName || (moduleExport && moduleExport.name) || 'UnnamedModule';
    
    // Environment detection and export
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

// Export the universalExport function itself
if (typeof module !== 'undefined' && module.exports) {
    module.exports = universalExport;
} else if (typeof define === 'function' && define.amd) {
    define('universalExport', [], function() {
        return universalExport;
    });
} else if (typeof exports !== 'undefined') {
    exports.universalExport = universalExport;
    exports.__esModule = true;
    exports.default = universalExport;
} else {
    const root = (function() {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof window !== 'undefined') return window;
        if (typeof global !== 'undefined') return global;
        if (typeof self !== 'undefined') return self;
        throw new Error('Unable to locate global object');
    })();
    
    root.universalExport = universalExport;
}