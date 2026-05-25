const fs = require('fs');
const path = require('path');

const cssReplacements = [
  { find: /#00f0ff/g, replace: '#60a5fa' },
  { find: /#00ffb7/g, replace: '#93c5fd' },
  { find: /rgba\(0, 255, 255,/g, replace: 'rgba(96, 165, 250,' },
  { find: /rgba\(0,255,255,/g, replace: 'rgba(96, 165, 250,' },
  { find: /rgba\(0, 255, 183,/g, replace: 'rgba(147, 197, 253,' },
  { find: /rgba\(0,255,183,/g, replace: 'rgba(147, 197, 253,' },
  { find: /\bcyan\b/g, replace: '#60a5fa' },
  { find: /#9bf5ff/g, replace: '#93c5fd' },
  { find: /linear-gradient\(90deg,#00f0ff,#00ffb7\)/g, replace: 'linear-gradient(90deg,#3b82f6,#60a5fa)' },
  { find: /1px solid rgba\(0, 255, 255,/g, replace: '1px solid rgba(96, 165, 250,' }
];

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.css')) {
      results.push(filePath);
    }
  });
  return results;
};

const cssFiles = walk(path.resolve(__dirname, 'src'));

cssFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add the root variables if it's index.css or App.css
  if (file.endsWith('index.css')) {
    content = `:root {
  /* --- Quad Light Blue Theme --- */
  --color-primary:        #3b82f6;   /* blue-500 */
  --color-primary-light:  #93c5fd;   /* blue-300 */
  --color-primary-dark:   #1d4ed8;   /* blue-700 */
  --color-accent:         #60a5fa;   /* blue-400 */
  --color-accent-glow:    rgba(96, 165, 250, 0.35);

  --color-bg:             #0a1628;   /* very dark blue-navy */
  --color-bg-card:        #0f2040;
  --color-bg-card-hover:  #132850;
  --color-border:         rgba(96, 165, 250, 0.25);
  --color-border-active:  rgba(96, 165, 250, 0.6);

  --color-text:           #e2eeff;
  --color-muted:          #7da3cc;
  --color-heading:        #bfdbfe;   /* blue-200 */

  --color-success:        #34d399;
  --color-error:          #f87171;
  --color-warning:        #fbbf24;

  /* Glow effects — replace cyan glow with blue glow */
  --glow-primary: 0 0 18px rgba(96, 165, 250, 0.55), 0 0 40px rgba(59, 130, 246, 0.3);
  --glow-card:    0 10px 30px rgba(59, 130, 246, 0.15);
}
` + content;
  }

  cssReplacements.forEach(({find, replace}) => {
    content = content.replace(find, replace);
  });
  
  // Custom specific replacements
  content = content.replace(/\.primaryBtn,\s*\.neon-btn,\s*\.connectCTA\s*\{[^}]*\}/g, '.primaryBtn, .neon-btn, .connectCTA {\n  background: linear-gradient(90deg, #3b82f6, #60a5fa);\n  box-shadow: 0 0 18px rgba(96, 165, 250, 0.55), 0 0 40px rgba(59, 130, 246, 0.3);\n}');
  content = content.replace(/\.neon-card\s*\{[^}]*\}/g, '.neon-card {\n  border: 1px solid rgba(96, 165, 250, 0.3);\n  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.12);\n}');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log('CSS updated successfully.');
