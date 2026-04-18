import fs from 'fs';

const goFile = fs.readFileSync('backend/game/hardcoded_reactions.go', 'utf-8');
const match = goFile.match(/var HardcodedReactions = map\[string\]\[\]string\{([\s\S]*?)\}/);

if (!match) {
    console.error('Could not find reactions in Go file');
    process.exit(1);
}

const lines = match[1].trim().split('\n');
const reactions = {};

lines.forEach(line => {
    const partMatch = line.match(/"(.*?)"\s*:\s*\{(.*?)\}/);
    if (partMatch) {
        const key = partMatch[1];
        const values = partMatch[2].split(',').map(v => v.trim().replace(/"/g, '')).filter(v => v);
        reactions[key] = values;
    }
});

const reactionPairs = [];
for (const [r1, r2s] of Object.entries(reactions)) {
    r2s.forEach(r2 => {
        const pair = [r1, r2].sort();
        const pairStr = JSON.stringify(pair);
        if (!reactionPairs.includes(pairStr)) {
            reactionPairs.push(pairStr);
        }
    });
}

const formattedPairs = 'const reactionPairs: Array<[string, string]> = [\n  ' + 
    reactionPairs.map(p => JSON.parse(p)).map(p => `['${p[0]}', '${p[1]}']`).join(', ') + 
    '\n]';

const jsFile = fs.readFileSync('frontend/src/utils/offlineBackend.ts', 'utf-8');

// Use a more specific replacement that covers the broken part
// We know it starts with const reactionPairs: Array<[string, string]> = [
// and ends with ] followed by a newline and const announcements
const updatedJsFile = jsFile.replace(/const reactionPairs: Array<\[string, string\]> = \[[\s\S]*?\]\n\nconst announcements/, formattedPairs + '\n\nconst announcements');

fs.writeFileSync('frontend/src/utils/offlineBackend.ts', updatedJsFile);
console.log('Successfully fixed reactions in offlineBackend.ts');
