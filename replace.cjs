const fs = require('fs');
const path = require('path');

function replaceRecursively(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceRecursively(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/rounded-none/g, 'rounded-2xl');
      content = content.replace(/rounded-sm/g, 'rounded-md'); // replace small ones just in case
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceRecursively('./src');
console.log('Replaced all rounded-none with rounded-2xl');
