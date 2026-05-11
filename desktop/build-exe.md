# Building the Windows EXE / macOS DMG / Linux AppImage

## Requirements
- Node.js 18+
- npm or pnpm
- Windows: Windows 10+ or Wine on Linux for cross-compilation
- macOS: Xcode command line tools for DMG

## Steps

### 1. Go to desktop folder
```bash
cd desktop
```

### 2. Add an app icon
Place a 256×256 PNG file named `icon.png` in the `desktop/` folder.
For best results use a square image (Pulse logo on dark background).

### 3. Install dependencies
```bash
npm install
```

### 4. Test locally (Electron dev mode)
```bash
npm start
```
This opens Pulse Messenger in an Electron window pointing to the live app URL.

### 5. Build installer

#### Windows (.exe NSIS installer):
```bash
npm run build:win
# Output: desktop/dist/Pulse Messenger Setup x.x.x.exe
```

#### macOS (.dmg):
```bash
npm run build:mac
# Output: desktop/dist/Pulse Messenger-x.x.x.dmg
```

#### Linux (AppImage):
```bash
npm run build:linux
# Output: desktop/dist/Pulse Messenger-x.x.x.AppImage
```

## Notes
- The app loads `https://pulse.replit.app` — update `APP_URL` in `main.js` to your production domain.
- All user data is stored in the browser session/localStorage inside Electron's webview.
- Auto-updates can be added via `electron-updater` package.
