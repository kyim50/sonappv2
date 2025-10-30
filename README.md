# LOL Voice Chat - Auto-Join Voice for League Teammates

An Electron desktop app that automatically detects when you're in a League of Legends game and creates voice channels with teammates who also have the app installed.

## Features

- 🎮 **Auto Game Detection** - Detects when League client is running and when you enter a game
- 👥 **Team Matching** - Uses Riot API to identify teammates in your game
- 🎙️ **Auto-Join Voice** - Automatically connects you with teammates who have the app
- 🔊 **High-Quality Voice** - Seamless voice chat using Agora.io
- 🔒 **Secure** - Uses Riot OAuth for authentication (to be implemented)

## Tech Stack

- **Frontend**: Electron + Vanilla JavaScript
- **Backend**: Node.js + Express + Socket.io
- **Voice**: Agora.io SDK
- **Game Detection**: League Client API (LCU) + Riot Games API
- **Region**: NA (North America)

## Prerequisites

Before you begin, ensure you have:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- League of Legends installed
- A Riot Games Developer API Key
- An Agora.io account for voice services

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to the project folder
cd lol-voice-app

# Install Electron app dependencies
npm install

# Install backend server dependencies
cd server
npm install
cd ..
```

### 2. Get Your Riot API Key

1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Sign in with your Riot account
3. Click "Register Product" or use Development API Key
4. Copy your API key

**Important**: Development API keys expire every 24 hours. For production, you'll need to register a product.

### 3. Get Agora Credentials

1. Go to [Agora Console](https://console.agora.io/)
2. Create a free account
3. Create a new project
4. Get your **App ID** and **App Certificate**
5. Enable "Testing mode" (allows usage without token for development)

### 4. Configure Environment Variables

```bash
# In the server folder, copy the example env file
cd server
cp .env.example .env
```

Edit `server/.env` and add your credentials:

```env
RIOT_API_KEY=RGAPI-your-key-here
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate
PORT=3001
```

### 5. Run the Application

You need to run both the backend server and the Electron app.

**Terminal 1 - Backend Server:**
```bash
cd server
npm start
```

You should see:
```
🚀 Server running on port 3001
✓ Riot API key verified
```

**Terminal 2 - Electron App:**
```bash
# From the root directory
npm start
```

## How It Works

### Architecture Flow

1. **Game Detection**
   - App monitors for League client process
   - Uses LCU API (`https://127.0.0.1:2999`) to detect active game
   - Polls every 3 seconds for game state changes

2. **Player Matching**
   - When game starts, app gets your PUUID
   - Queries Riot API for active game data
   - Identifies your team (team 100 or 200)
   - Gets list of teammates

3. **User Discovery**
   - Backend maintains list of online users with the app
   - Matches your teammates' PUUIDs with registered users
   - Notifies all matched teammates

4. **Voice Channel Creation**
   - Backend creates unique channel ID: `{gameId}_{teamId}_{timestamp}`
   - Generates Agora token (or uses App ID only in testing)
   - Auto-joins all teammates to voice channel

5. **Voice Communication**
   - Uses Agora SDK for WebRTC voice
   - Low latency (<100ms typical)
   - Supports mute/deafen controls

### Key Files

```
lol-voice-app/
├── src/
│   ├── main.js                    # Electron main process
│   ├── preload.js                 # IPC bridge (security)
│   ├── renderer/
│   │   ├── index.html            # UI
│   │   └── renderer.js           # Frontend logic
│   └── services/
│       ├── gameDetector.js       # League client detection
│       ├── riotAPI.js            # Riot API wrapper
│       └── voiceManager.js       # Agora voice integration
├── server/
│   └── index.js                  # Backend + WebSocket server
└── package.json
```

## Usage

### First Time Setup

1. Launch the app
2. Enter your Riot ID:
   - Game Name: Your in-game name (e.g., "FakerTheGod")
   - Tag Line: Your region tag (e.g., "NA1")
3. Click Login

### During Gameplay

1. Launch League of Legends
2. The app will show "League Client: Running"
3. Enter a game (normal, ranked, ARAM, etc.)
4. App automatically:
   - Detects you're in game
   - Finds teammates with the app
   - Creates voice channel
   - Auto-joins you to voice

### Voice Controls

- **Mute**: Toggle your microphone on/off
- **Deafen**: Mute yourself AND stop hearing others
- **Leave Voice**: Manually disconnect from voice channel

## Current Limitations & TODOs

### Authentication
- ⚠️ Currently uses simplified login (no real OAuth)
- 🔧 **TODO**: Implement [Riot Sign-On (RSO)](https://developer.riotgames.com/docs/lol#rso-integration)

### Voice Integration
- ⚠️ Agora SDK integration is stubbed out
- 🔧 **TODO**: Complete Agora voice initialization
- 🔧 **TODO**: Implement proper token generation on backend

### Features to Add
- [ ] Riot OAuth implementation
- [ ] Complete Agora voice integration
- [ ] Push-to-talk support
- [ ] Volume controls per user
- [ ] Voice activity indicator
- [ ] Friend list / invite system
- [ ] Settings panel (input/output device selection)
- [ ] Reconnection handling
- [ ] Minimize to system tray
- [ ] Auto-update mechanism

### Known Issues
- Game detection only works when game is fully loaded
- No reconnection if connection drops mid-game
- Windows-only process detection (needs Mac/Linux support)

## Riot API Rate Limits

Development key limits:
- 20 requests every 1 second
- 100 requests every 2 minutes

Be mindful of these limits. The app polls less frequently to stay within limits.

## Agora Voice Notes

### Free Tier Limits
- 10,000 minutes/month free
- Perfect for testing and small groups

### For Production
1. Implement proper token generation using `agora-access-token` package
2. Set up TURN servers for better NAT traversal
3. Enable encryption
4. Implement reconnection logic

## Development

### Run in Dev Mode

```bash
# Electron app with DevTools
npm run dev

# Backend with nodemon (auto-restart)
cd server
npm run dev
```

### Project Structure Tips

- **IPC Communication**: All Electron IPC goes through `preload.js` for security
- **Services**: Game detection, Riot API, and voice are separate modules
- **Socket.io**: Real-time communication between Electron app and backend
- **Channel Management**: Backend handles all channel creation/cleanup logic

## Security Notes

- Never commit your `.env` file with real credentials
- Use Riot OAuth in production (not placeholder auth)
- Validate all user inputs on backend
- Implement rate limiting on backend endpoints
- Use proper Agora token generation (not App ID only mode)

## Troubleshooting

### "Riot API key verification failed"
- Check your API key is correct in `server/.env`
- Ensure your key hasn't expired (dev keys expire daily)
- Verify you have internet connection

### "League Client Not Running"
- Make sure League is fully launched
- On Mac/Linux, update process names in `gameDetector.js`
- Check console logs for process detection errors

### "Cannot connect to backend"
- Ensure backend server is running on port 3001
- Check firewall isn't blocking localhost connections
- Verify `BACKEND_URL` in your config

### Voice not working
- Agora integration needs to be completed
- Check Agora App ID is correct
- Verify network allows WebRTC connections
- Check browser console for errors

## Resources

- [Riot Games API Documentation](https://developer.riotgames.com/apis)
- [League Client API (LCU)](https://hextechdocs.dev/getting-started-with-the-lcu-api/)
- [Agora Documentation](https://docs.agora.io/en/)
- [Electron Documentation](https://www.electronjs.org/docs/latest)
- [Socket.io Documentation](https://socket.io/docs/v4/)

## Contributing

This is a starter template. Feel free to:
- Implement missing features
- Add tests
- Improve UI/UX
- Optimize performance
- Add support for other regions

## License

MIT License - See LICENSE file for details

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Riot Games. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.

---

**Happy Gaming! 🎮**
