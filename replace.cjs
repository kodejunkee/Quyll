const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/timeline_event/g, 'outline');
  content = content.replace(/TimelineEvent/g, 'Outline');
  content = content.replace(/timeline_events/g, 'outlines');
  
  // Specific table/route string replacements
  content = content.replace(/'timeline'/g, "'outliner'");
  content = content.replace(/"timeline"/g, '"outliner"');
  content = content.replace(/timelineEvents/g, 'outlines');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.css') || fullPath.endsWith('.cjs')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir('src');
console.log('Done replacement');
