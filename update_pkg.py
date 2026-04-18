import json

with open('package.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

data['scripts'] = {
    "init": "node init.js",
    "start": "pnpm frontend:dev",
    "dev": "pnpm start",
    "build": "pnpm build:frontend",
    "frontend:dev": "pnpm -C frontend dev",
    "build:frontend": "pnpm -C frontend build",
    "electron:dev": "pnpm -C frontend electron:dev",
    "electron:run": "pnpm -C frontend electron:run",
    "electron:pack:win": "pnpm -C frontend electron:pack:win",
    "clean": "node -e \"const fs = require('fs'); ['dist'].forEach(f => { try { if (fs.existsSync(f)) { if (fs.statSync(f).isDirectory()) { fs.rmSync(f, {recursive: true}); } else { fs.unlinkSync(f); } } } catch(e) {} })\"",
    "clean:all": "pnpm clean && node -e \"const fs = require('fs'); ['frontend/node_modules', 'frontend/dist', 'frontend/.vite'].forEach(f => { try { if (fs.existsSync(f)) { fs.rmSync(f, {recursive: true}); } } catch(e) {} })\""
}

with open('package.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
