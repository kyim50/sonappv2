# Quick Start Guide 🚀

Get your League of Legends voice chat app running in 5 minutes!

## Prerequisites Checklist
- [ ] Node.js installed (download from https://nodejs.org)
- [ ] League of Legends installed
- [ ] Riot API Key (get from https://developer.riotgames.com)
- [ ] Agora Account (create at https://console.agora.io)

## Step 1: Get Your API Keys (5 min)

### Riot API Key
1. Visit: https://developer.riotgames.com
2. Sign in with your League account
3. Click "REGENERATE API KEY" under Development section
4. Copy the key (starts with RGAPI-)

### Agora Credentials
1. Visit: https://console.agora.io
2. Create free account
3. Click "Create New Project"
4. Name it "LOL Voice Chat"
5. Copy your **App ID**
6. Go to project settings, enable and copy **Primary Certificate**

## Step 2: Install & Configure (2 min)

```bash
# Navigate to project folder
cd lol-voice-app

# Install dependencies for Electron app
npm install

# Install dependencies for backend
cd server
npm install

# Create environment file
cp .env.example .env
```

Now edit `server/.env` with your credentials:

```env
RIOT_API_KEY=RGAPI-xxxxxxxxx  # Your Riot API key
AGORA_APP_ID=xxxxxxxxxxxxx    # Your Agora App ID
AGORA_APP_CERTIFICATE=xxxxxx  # Your Agora Certificate
PORT=3001
```

## Step 3: Run (1 min)

Open **TWO** terminal windows:

**Terminal 1 - Start Backend:**
```bash
cd server
npm start
```
Wait for "✓ Riot API key verified"

**Terminal 2 - Start App:**
```bash
# From root folder
npm start
```

## Step 4: Test

1. App window opens
2. Enter your Riot ID (e.g., "YourName" and "NA1")
3. Click Login
4. Launch League of Legends
5. Start a game
6. App will auto-detect and create voice channel!

## Troubleshooting

**Backend won't start?**
- Check your Riot API key is correct
- Make sure port 3001 is not in use

**App can't detect League?**
- Make sure League is fully loaded (not just launcher)
- Check console for errors

**Need help?**
- Read full README.md
- Check your API keys haven't expired
- Ensure Node.js version is 16+

## Next Steps

Once working, invite friends to:
1. Clone the same project
2. Use their own Riot IDs to login
3. Join the same game
4. Voice chat will auto-connect!

---

**Pro Tip**: Development Riot API keys expire every 24 hours. You'll need to regenerate daily until you register a production key.

Happy gaming! 🎮
