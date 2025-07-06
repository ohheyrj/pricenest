/**
 * Module Wrapper Utility
 * Provides a universal module export pattern that works with:
 * - CommonJS (Node.js, current usage)
 * - ES Modules (webpack, modern bundlers)
 * - Browser globals (direct script tags)
 * 
 * @module ModuleWrapper
 */

/**
 * Wraps a module to work in multiple environments
 * 
 * @param {string} moduleName - Name for the module (used for global assignment)
 * @param {Function} factory - Factory function that returns the module
 * @param {Array<string>} dependencies - Optional array of dependency names
 * @returns {*} The module export
 * 
 * @example
 * // Simple module without dependencies
 * moduleWrapper('MyModule', function() {
 *   class MyModule {
 *     constructor() {
 *       this.name = 'MyModule';
 *     }
 *   }
 *   return MyModule;
 * });
 * 
 * @example
 * // Module with dependencies
 * moduleWrapper('MyService', function(APIClient, Modal) {
 *   class MyService {
 *     constructor() {
 *       this.api = new APIClient();
 *       this.modal = new Modal();
 *     }
 *   }
 *   return MyService;
 * }, ['APIClient', 'Modal']);
 */
function moduleWrapper(moduleName, factory, dependencies = []) {
    'use strict';
    
    // Resolve dependencies based on environment
    const resolveDependencies = function() {
        return dependencies.map(function(dep) {
            // Try CommonJS first
            if (typeof require !== 'undefined') {
                try {
                    // Handle relative paths
                    if (dep.startsWith('./') || dep.startsWith('../')) {
                        return require(dep);
                    }
                    // Try to require from common locations
                    try {
                        return require('./' + dep);
                    } catch (e1) {
                        try {
                            return require('../' + dep);
                        } catch (e2) {
                            return require(dep);
                        }
                    }
                } catch (e) {
                    // Fall through to next resolution method
                }
            }
            
            // Try ES modules (webpack will handle this)
            if (typeof __webpack_require__ !== 'undefined') {
                // Webpack will replace this at build time
                return __webpack_require__(dep);
            }
            
            // Try global scope
            if (typeof window !== 'undefined' && window[dep]) {
                return window[dep];
            }
            
            if (typeof global !== 'undefined' && global[dep]) {
                return global[dep];
            }
            
            if (typeof self !== 'undefined' && self[dep]) {
                return self[dep];
            }
            
            // Dependency not found
            console.warn('Dependency "' + dep + '" not found for module "' + moduleName + '"');
            return undefined;
        });
    };
    
    // Get the module by calling factory with resolved dependencies
    const moduleExport = factory.apply(null, resolveDependencies());
    
    // CommonJS / Node.js
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = moduleExport;
    }
    // AMD (RequireJS)
    else if (typeof define === 'function' && define.amd) {
        define(moduleName, dependencies, function() {
            return moduleExport;
        });
    }
    // ES Modules (for webpack and modern bundlers)
    else if (typeof exports !== 'undefined') {
        exports[moduleName] = moduleExport;
        // Also set default export for ES modules
        if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
            exports.__esModule = true;
            exports.default = moduleExport;
        }
    }
    // Browser global
    else {
        const root = typeof window !== 'undefined' ? window : 
                    typeof global !== 'undefined' ? global : 
                    typeof self !== 'undefined' ? self : this;
        
        root[moduleName] = moduleExport;
    }
    
    return moduleExport;
}

// Export the moduleWrapper function itself using the same pattern
(function() {
    const exportModuleWrapper = function() {
        return moduleWrapper;
    };
    
    // CommonJS
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = moduleWrapper;
    }
    // AMD
    else if (typeof define === 'function' && define.amd) {
        define('moduleWrapper', [], exportModuleWrapper);
    }
    // ES Modules
    else if (typeof exports !== 'undefined') {
        exports.moduleWrapper = moduleWrapper;
        if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
            exports.__esModule = true;
            exports.default = moduleWrapper;
        }
    }
    // Browser global
    else {
        const root = typeof window !== 'undefined' ? window : 
                    typeof global !== 'undefined' ? global : 
                    typeof self !== 'undefined' ? self : this;
        
        root.moduleWrapper = moduleWrapper;
    }
})();