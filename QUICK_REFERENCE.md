# ⚡ QUICK REFERENCE CARD

## 🚀 START THE APP (2 Terminals Required)

### Terminal 1: Backend Server
```bash
cd server
npm start
```
Wait for: `✅ Riot API key verified`

### Terminal 2: Electron App
```bash
npm start
```

---

## 📦 INSTALLATION (First Time Only)

### Windows:
```cmd
install.bat
```

### Mac/Linux:
```bash
chmod +x install.sh
./install.sh
```

### Manual:
```bash
npm install
cd server && npm install
```

---

## 🔑 YOUR API KEYS

**Location:** `server/.env`

**Riot API Key (Expires Daily):**
```
RGAPI-7a0d27d0-c993-4825-93d8-2b6252fe780a
```
Regenerate daily at: https://developer.riotgames.com/

**Agora App ID:**
```
dabac98095ea4cd290cc396a679468dd
```

**Agora Settings:**
- Enable "App ID only" mode in console for testing
- Console: https://console.agora.io/

---

## 🎮 USAGE

1. Run backend + app (see above)
2. Login with Riot ID: `YourName#NA1`
3. Launch League of Legends
4. Start any game mode
5. App auto-detects and creates voice channel

---

## 🔧 COMMON COMMANDS

### Update Riot API Key (Daily)
Edit `server/.env`:
```env
RIOT_API_KEY=RGAPI-your-new-key-here
```
Then restart backend server.

### Check Server Status
```bash
curl http://localhost:3001/health
```

### View Logs
Backend logs show in Terminal 1
App logs show in Terminal 2

### Development Mode
```bash
npm run dev  # Opens with DevTools
```

---

## 🐛 QUICK FIXES

**Backend won't start:**
```bash
# Check if port is in use
netstat -an | grep 3001  # Mac/Linux
netstat -an | findstr 3001  # Windows

# Kill process on port
kill -9 $(lsof -t -i:3001)  # Mac/Linux
```

**Riot API not working:**
- Regenerate key (expires every 24h)
- Check no extra spaces in .env

**League not detected:**
- Make sure League is fully loaded
- Wait 3-5 seconds after loading

**Agora errors:**
- Enable "App ID only" in Agora console
- Check App ID matches .env file

---

## 📂 IMPORTANT FILES

```
server/.env              ← Your API keys (EDIT THIS)
YOUR_SETUP_GUIDE.md     ← Full setup instructions
README.md               ← Complete documentation
server/index.js         ← Backend server
src/main.js             ← Electron main process
```

---

## 🌐 USEFUL LINKS

**Regenerate Riot Key:** https://developer.riotgames.com/
**Agora Console:** https://console.agora.io/
**Riot API Docs:** https://developer.riotgames.com/docs/lol
**Agora Voice Docs:** https://docs.agora.io/en/

---

## ⚡ COMMON ISSUES

### "Riot API key verification failed"
→ Regenerate your key (expires daily)
→ Check server/.env has correct key

### "League Client Not Running"
→ Launch League and wait for full load
→ Check console for process errors

### "Agora configuration warnings"
→ Enable "App ID only" in Agora console
→ Verify App ID in server/.env

### Port already in use
→ Another app using port 3001
→ Change PORT in server/.env
→ Or kill the process using the port

---

## 📊 STATUS INDICATORS

**Backend Terminal:**
```
✅ = Working correctly
⚠️ = Warning (usually fine)
❌ = Error (needs fixing)
```

**Electron App:**
```
Green indicator = Active/Running
Gray indicator = Inactive
```

---

## 🔄 UPDATE WORKFLOW

**Daily (Riot API Key):**
1. Go to https://developer.riotgames.com/
2. Click "REGENERATE API KEY"
3. Copy new key
4. Update server/.env
5. Restart backend server

**After Code Changes:**
1. Stop both terminals (Ctrl+C)
2. Restart backend: cd server && npm start
3. Restart app: npm start

---

## 💾 PROJECT STRUCTURE

```
lol-voice-app/
├── src/              ← Electron app code
├── server/           ← Backend server
├── server/.env       ← YOUR API KEYS HERE
└── *.md              ← Documentation
```

---

## ⌨️ KEYBOARD SHORTCUTS

**In Electron App:**
- `Ctrl+Shift+I` / `Cmd+Option+I` - Open DevTools
- `Ctrl+R` / `Cmd+R` - Reload app
- `Ctrl+Q` / `Cmd+Q` - Quit app

---

## 📞 GETTING HELP

1. Check YOUR_SETUP_GUIDE.md
2. Read error messages in terminal
3. Check console logs (F12 in app)
4. Verify API keys are correct
5. Make sure keys haven't expired

---

## ✅ TESTING CHECKLIST

- [ ] Backend starts without errors
- [ ] See "✅ Riot API key verified"
- [ ] Electron app opens
- [ ] Can login with Riot ID
- [ ] League detection works
- [ ] Game status updates
- [ ] No console errors

---

**Remember:** Riot dev key expires every 24 hours!
**Bookmark:** https://developer.riotgames.com/

---

**Quick Start:**
1. Run `install.bat` (Windows) or `./install.sh` (Mac/Linux)
2. cd server && npm start
3. (New terminal) npm start
4. Login and play!
