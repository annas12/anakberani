import { readFileSync, writeFileSync } from 'node:fs';
const files = ['program1.js','program2.js','program3.js','program.js','lessons.js','branches.js'];
writeFileSync('src/content.js', files.map(f=>readFileSync('public/'+f,'utf8')).join('\n')+'\nexport { program, lessons, branches };\n');
