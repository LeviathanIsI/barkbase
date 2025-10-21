const fs = require('fs');
const path = require('path');
const { readdir, readFile, writeFile } = require('fs/promises');

async function fixLambdaPaths() {
    const lambdasDir = path.join(__dirname, 'lambdas');
    const dirs = await readdir(lambdasDir, { withFileTypes: true });
    
    for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        
        const indexPath = path.join(lambdasDir, dir.name, 'index.js');
        if (!fs.existsSync(indexPath)) continue;
        
        let content = await readFile(indexPath, 'utf8');
        const original = content;
        
        // Fix all path checks to include /api/v1/
        content = content.replace(/path === '\/([a-z-]+)'/g, "path.endsWith('/$1')");
        
        if (content !== original) {
            await writeFile(indexPath, content, 'utf8');
            console.log(`✅ Fixed: ${dir.name}/index.js`);
        }
    }
    
    console.log('\n🎉 All Lambda paths fixed!');
}

fixLambdaPaths().catch(console.error);

