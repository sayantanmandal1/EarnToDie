const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'audio/AudioManagementSystem.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all remaining logger calls
content = content.replace(
    /this\.logger\.(info|warn|error|debug)\(/g,
    '(this.logger && this.logger.$1) ? this.logger.$1('
);

// Add closing parentheses and fallback
content = content.replace(
    /\(this\.logger && this\.logger\.(info|warn|error|debug)\) \? this\.logger\.\1\(([^)]+)\);/g,
    '(this.logger && this.logger.$1) ? this.logger.$1($2) : console.$1($2);'
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed all logger calls in AudioManagementSystem.js');