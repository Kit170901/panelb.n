const fs = require('fs');
const path = require('path');

const win1252Rev = {
    '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
    'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
    '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
    '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F
};

function getByte(c) {
    if (win1252Rev[c] !== undefined) return win1252Rev[c];
    const code = c.charCodeAt(0);
    if (code <= 0xFF) return code;
    return -1;
}

function fixMojibakeString(str) {
    // A regular expression that matches a UTF-8 character that was decoded via Windows-1252.
    // The sequence starts with C2-DF or E0-EF.
    // The trail bytes would originally be 80-BF, but due to Windows-1252 they can map to characters like '‡'.
    // We match any character sequence of length 2 or 3 that starts with a lead byte and followed by ANY character (we'll validate the bytes later).
    
    // Actually, rather than a regex, we can just scan for sequences of characters that map to valid UTF-8 bytes.
    // But an easier regex:
    // Lead byte for 2-byte char: C2 to DF.
    // Lead byte for 3-byte char: E0 to EF.
    // Trail byte in Windows-1252: anything that maps to 80-BF.
    
    const isTrailByte = (c) => {
        const b = getByte(c);
        return b >= 0x80 && b <= 0xBF;
    };
    
    let res = "";
    for (let i = 0; i < str.length; i++) {
        let b1 = getByte(str[i]);
        if (b1 >= 0xC2 && b1 <= 0xDF && i + 1 < str.length && isTrailByte(str[i+1])) {
            let bytes = [b1, getByte(str[i+1])];
            res += Buffer.from(bytes).toString('utf8');
            i += 1;
        } else if (b1 >= 0xE0 && b1 <= 0xEF && i + 2 < str.length && isTrailByte(str[i+1]) && isTrailByte(str[i+2])) {
            let bytes = [b1, getByte(str[i+1]), getByte(str[i+2])];
            res += Buffer.from(bytes).toString('utf8');
            i += 2;
        } else {
            res += str[i];
        }
    }
    return res;
}

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.html')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/Administrator/.gemini/antigravity/scratch/hs-house/src');
files.push('c:/Users/Administrator/.gemini/antigravity/scratch/hs-house/index.html');
let fixedCount = 0;

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const fixed = fixMojibakeString(content);
    if (content !== fixed) {
        fs.writeFileSync(file, fixed, 'utf8');
        console.log('Fixed:', file);
        fixedCount++;
    }
}
console.log('Total fixed:', fixedCount);
