#!/usr/bin/env node

/**
 * Script to update all modules with universal export pattern
 */

const fs = require('fs');
const path = require('path');

// Modules to update (excluding already updated ones)
const modulesToUpdate = [
    'src/static/js/services/BookSearch.js',
    'src/static/js/services/MovieSearch.js',
    'src/static/js/components/UIComponents.js',
    'src/static/js/components/FormHandler.js',
    'src/static/js/components/FilterControls.js',
    'src/static/js/csv-importer.js'
];

// Universal export template
const getUniversalExportPattern = (moduleName) => `
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
})();`;

// Function to extract module name from file path
function getModuleNameFromPath(filePath) {
    const basename = path.basename(filePath, '.js');
    // Convert kebab-case to PascalCase
    return basename.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
                   .replace(/^[a-z]/, (match) => match.toUpperCase());
}

// Function to update a single module
function updateModule(filePath) {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ File not found: ${filePath}`);
        return false;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if already using universal export
    if (content.includes('universalExport(')) {
        console.log(`✅ Already updated: ${filePath}`);
        return true;
    }
    
    // Extract module name from file path
    const moduleName = getModuleNameFromPath(filePath);
    
    // Find existing export patterns
    const exportPatterns = [
        /\/\/ Export for use in other modules\s*\n(if \(typeof module[^}]+})/gm,
        /\/\/ Export for use in other modules\s*\n([\s\S]*?module\.exports[^;]+;)/gm,
        /(if \(typeof module[^}]+})/gm,
        /(module\.exports\s*=\s*[^;]+;)/gm
    ];
    
    let updatedContent = content;
    let patternFound = false;
    
    // Try each pattern
    for (const pattern of exportPatterns) {
        const matches = content.match(pattern);
        if (matches) {
            console.log(`📝 Updating ${filePath} with pattern: ${pattern}`);
            updatedContent = content.replace(pattern, getUniversalExportPattern(moduleName));
            patternFound = true;
            break;
        }
    }
    
    if (!patternFound) {
        console.log(`⚠️  No export pattern found in ${filePath}, adding to end`);
        updatedContent = content + '\n' + getUniversalExportPattern(moduleName);
    }
    
    // Write updated content
    fs.writeFileSync(fullPath, updatedContent, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
}

// Main execution
console.log('🚀 Updating modules with universal export pattern...\n');

let successCount = 0;
let totalCount = modulesToUpdate.length;

modulesToUpdate.forEach(filePath => {
    if (updateModule(filePath)) {
        successCount++;
    }
});

console.log(`\n✨ Update complete: ${successCount}/${totalCount} modules updated`);
console.log('\n📋 Summary of changes:');
console.log('- Added universal export pattern to all modules');
console.log('- Modules now work with CommonJS, ES modules, and browser globals');
console.log('- Existing CommonJS usage continues to work');
console.log('- Webpack can now use ES module imports');
console.log('\n🔧 Next steps:');
console.log('1. Test webpack builds');
console.log('2. Update import statements to use ES module syntax if desired');
console.log('3. Remove this script file when done');