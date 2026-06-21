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

      // Keep text dark on bright background badges in both modes
      content = content.replace(/bg-yellow-300 text-neutral-900 dark:text-neutral-100/g, 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900');
      content = content.replace(/text-neutral-900 dark:text-neutral-100 bg-yellow-300/g, 'text-neutral-900 bg-yellow-300 dark:bg-yellow-400');
      
      content = content.replace(/bg-emerald-300 text-neutral-900 dark:text-neutral-100/g, 'bg-emerald-300 dark:bg-emerald-400 text-neutral-900');
      content = content.replace(/text-neutral-900 dark:text-neutral-100 bg-emerald-300/g, 'text-neutral-900 bg-emerald-300 dark:bg-emerald-400');
      
      content = content.replace(/bg-amber-300 text-neutral-900 dark:text-neutral-100/g, 'bg-amber-300 dark:bg-amber-400 text-neutral-900');
      content = content.replace(/text-neutral-900 dark:text-neutral-100 bg-amber-300/g, 'text-neutral-900 bg-amber-300 dark:bg-amber-400');

      content = content.replace(/bg-blue-300 text-neutral-900 dark:text-neutral-100/g, 'bg-blue-300 dark:bg-blue-400 text-neutral-900');
      content = content.replace(/text-neutral-900 dark:text-neutral-100 bg-blue-300/g, 'text-neutral-900 bg-blue-300 dark:bg-blue-400');
      
      content = content.replace(/bg-red-400 text-neutral-900 dark:text-neutral-100/g, 'bg-red-400 dark:bg-red-500 text-white');
      content = content.replace(/text-neutral-900 dark:text-neutral-100 bg-red-400/g, 'text-white bg-red-400 dark:bg-red-500');
      content = content.replace(/bg-red-400 dark:bg-red-900\/80 text-neutral-900 dark:text-neutral-100/g, 'bg-red-400 dark:bg-red-500 text-white');
      content = content.replace(/text-neutral-900 dark:text-neutral-100 bg-red-400 dark:bg-red-900\/80/g, 'text-white bg-red-400 dark:bg-red-500');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceRecursively('./src');
console.log('Fixed contrast');
