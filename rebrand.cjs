const fs = require('fs');
const path = require('path');

const replacements = [
  { find: /SwaparcApp/g, replace: 'QuadApp' },
  { find: /swaparc_history/g, replace: 'quad_history' },
  { find: /swaparc_lp_cache_/g, replace: 'quad_lp_cache_' },
  { find: /swaparc_landing_api_stats/g, replace: 'quad_landing_api_stats' },
  { find: /SwapARC Token/g, replace: 'Quad Token' },
  { find: /SWPRC/g, replace: 'QDRC' },
  { find: /swprc/g, replace: 'qdrc' },
  { find: /Early Swaparcer/g, replace: 'Early Quadrant' },
  { find: /earlySwaparcer/g, replace: 'earlyQuadrant' },
  { find: /isEarlySwaparcer/g, replace: 'isEarlyQuadrant' },
  { find: /countEarlySwaparcers/g, replace: 'countEarlyQuadrants' },
  { find: /snapshotEarlySwaparcers/g, replace: 'snapshotEarlyQuadrants' },
  { find: /Why Swaparc/g, replace: 'Why Quad' },
  { find: /SWAPARC/g, replace: 'QUAD' },
  { find: /SwapARC/g, replace: 'Quad' },
  { find: /Swaparc/g, replace: 'Quad' },
  { find: /swaparc/g, replace: 'quad' }
];

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(file)) {
        results = results.concat(walk(filePath));
      }
    } else {
      if (!file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.svg') && !file.endsWith('.woff2') && !file.endsWith('.wasm') && !file.endsWith('.zkey')) {
        results.push(filePath);
      }
    }
  });
  return results;
};

const dirsToProcess = ['src', 'public', 'api', 'scripts', 'data', 'lib', 'docs'];
let allFiles = ['package.json', 'index.html', 'README.md', 'vercel.json', 'server.js', '.env.example'];

dirsToProcess.forEach(d => {
  const fullPath = path.resolve(__dirname, d);
  if (fs.existsSync(fullPath)) {
    allFiles = allFiles.concat(walk(fullPath));
  }
});

let modifiedFilesCount = 0;

allFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // We apply replacements in order. Notice that longer/specific matches are first!
    replacements.forEach(({find, replace}) => {
      content = content.replace(find, replace);
    });
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      modifiedFilesCount++;
    }
  }
});

console.log(`Replacement complete. Modified ${modifiedFilesCount} files.`);
