/**
 * Apply Universal Export Helper
 * A utility to quickly apply the universal export pattern to existing modules
 * 
 * This file provides a simple function that can be copied to the end of any module
 * to enable universal export functionality.
 */

/**
 * Copy this function to the end of any module file to enable universal exports
 * 
 * @param {*} moduleExport - The module/class/function to export
 * @param {string} [globalName] - Optional name for global assignment
 * 
 * @example
 * // At the end of your module file:
 * // Replace the existing export code with:
 * 
 * // Export for use in other modules
 * // Using universal export pattern for CommonJS, ES modules, and browser compatibility
 * (function() {
 *     'use strict';
 *     
 *     // Universal export function
 *     function universalExport(moduleExport, globalName) {
 *         const name = globalName || (moduleExport && moduleExport.name) || 'UnnamedModule';
 *         
 *         if (typeof module !== 'undefined' && module.exports) {
 *             // CommonJS (Node.js, current usage)
 *             module.exports = moduleExport;
 *         } else if (typeof define === 'function' && define.amd) {
 *             // AMD (RequireJS)
 *             define(name, [], function() {
 *                 return moduleExport;
 *             });
 *         } else if (typeof exports !== 'undefined') {
 *             // ES Modules (webpack, modern bundlers)
 *             exports[name] = moduleExport;
 *             exports.__esModule = true;
 *             exports.default = moduleExport;
 *         } else {
 *             // Browser globals (direct script tags)
 *             const root = (function() {
 *                 if (typeof globalThis !== 'undefined') return globalThis;
 *                 if (typeof window !== 'undefined') return window;
 *                 if (typeof global !== 'undefined') return global;
 *                 if (typeof self !== 'undefined') return self;
 *                 throw new Error('Unable to locate global object');
 *             })();
 *             
 *             root[name] = moduleExport;
 *         }
 *         
 *         return moduleExport;
 *     }
 *     
 *     // Export YourModuleName
 *     universalExport(YourModuleName);
 * })();
 */

// Example usage template - DO NOT COPY THIS, just copy the function above
function getUniversalExportTemplate(moduleName) {
    return `
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
    
    // Export ${moduleName}
    universalExport(${moduleName});
})();
    `.trim();
}

// Export this utility if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getUniversalExportTemplate };
}