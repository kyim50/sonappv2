# Complete Project Structure

```
lol-voice-app/
│
├── package.json                           # Electron app dependencies & scripts
├── .gitignore                            # Git ignore rules (protect API keys)
│
├── README.md                             # Complete documentation (8000+ words)
├── QUICKSTART.md                         # Fast 5-minute setup guide
├── PROJECT_SUMMARY.md                    # Detailed technical explanation
├── ARCHITECTURE.md                       # Visual diagrams & data flow
│
├── src/                                  # ELECTRON DESKTOP APPLICATION
│   │
│   ├── main.js                          # Main process (Node.js environment)
│   │                                     # - Creates app window
│   │                                     # - Initializes all services
│   │                                     # - Handles IPC from renderer
│   │                                     # - Manages game detection flow
│   │
│   ├── preload.js                       # IPC Security Bridge
│   │                                     # - Exposes safe APIs to renderer
│   │                                     # - Context isolation layer
│   │                                     # - Prevents direct Node.js access
│   │
│   ├── renderer/                        # Frontend (Browser environment)
│   │   ├── index.html                   # User Interface
│   │   │                                 # - Login screen
│   │   │                                 # - Game status display
│   │   │                                 # - Voice controls (mute/deafen)
│   │   │                                 # - Teammate list
│   │   │
│   │   └── renderer.js                  # Frontend Logic
│   │                                     # - UI state management
│   │                                     # - Event handlers
│   │                                     # - IPC communication
│   │
│   └── services/                        # Core Services (Main process)
│       │
│       ├── gameDetector.js              # League Client Detection
│       │                                 # - Monitor League process
│       │                                 # - Poll LCU API every 3s
│       │                                 # - Detect game start/end
│       │                                 # - Parse lockfile for credentials
│       │
│       ├── riotAPI.js                   # Riot Games API Client
│       │                                 # - Get account by PUUID/Riot ID
│       │                                 # - Get active game data
│       │                                 # - Get summoner info
│       │                                 # - Match history queries
│       │                                 # - NA region (na1)
│       │
│       └── voiceManager.js              # Voice & Backend Communication
│                                         # - Socket.io client
│                                         # - Agora SDK wrapper
│                                         # - Mute/deafen controls
│                                         # - Channel join/leave logic
│
└── server/                               # BACKEND SERVER
    │
    ├── package.json                      # Server dependencies
    │
    ├── .env.example                      # Configuration template
    │                                     # - RIOT_API_KEY
    │                                     # - AGORA_APP_ID
    │                                     # - AGORA_APP_CERTIFICATE
    │                                     # - PORT
    │
    └── index.js                          # Main Server Application
                                          # - Express HTTP server
                                          # - Socket.io WebSocket server
                                          # - User management (activeUsers Map)
                                          # - Channel management (activeChannels Map)
                                          # - Team matching logic
                                          # - Riot API verification
                                          # - Agora token generation
                                          # - Channel cleanup
```

## File Count by Category

**Documentation**: 4 files (README, QUICKSTART, PROJECT_SUMMARY, ARCHITECTURE)
**Configuration**: 3 files (2x package.json, .env.example, .gitignore)
**Frontend**: 2 files (index.html, renderer.js)
**Backend**: 1 file (server/index.js)
**Electron Core**: 2 files (main.js, preload.js)
**Services**: 3 files (gameDetector, riotAPI, voiceManager)

**Total**: 15 source files

## Lines of Code

- **src/main.js**: ~180 lines
- **src/services/gameDetector.js**: ~200 lines
- **src/services/riotAPI.js**: ~150 lines
- **src/services/voiceManager.js**: ~170 lines
- **server/index.js**: ~360 lines
- **src/renderer/index.html**: ~280 lines
- **src/renderer/renderer.js**: ~180 lines
- **src/preload.js**: ~35 lines

**Total Code**: ~1,500+ lines

## Key Files Explained

### 📱 ELECTRON APP (src/)

**src/main.js**
- Entry point for Electron
- Creates the BrowserWindow (400x600px)
- Initializes services: gameDetector, riotAPI, voiceManager
- Sets up event listeners for game state changes
- Handles IPC calls from renderer (login, mute, deafen, leave)
- Manages the flow: game detected → query Riot API → create channel

**src/preload.js**
- Security layer between renderer and main process
- Exposes only safe methods via contextBridge
- Prevents renderer from accessing Node.js directly
- APIs: login, getUser, toggleMute, toggleDeafen, leaveVoice
- Event listeners: onGameState, onClientStatus, onVoiceJoined, onError

**src/renderer/index.html**
- Single-page application UI
- Login form (Riot ID input)
- Status indicators (client running, in game, summoner name)
- Voice active indicator (shows when connected)
- Teammate list (shows connected teammates)
- Control buttons (mute, deafen, leave voice)
- Styled with embedded CSS (gradient background, card UI)

**src/renderer/renderer.js**
- Frontend JavaScript logic
- Manages UI state (logged in, muted, deafened)
- Handles login process
- Updates UI based on game state events
- Calls IPC methods for voice controls
- Event-driven architecture

### 🔧 SERVICES (src/services/)

**gameDetector.js**
- Extends EventEmitter for event-based notifications
- Monitors for League client process every 3 seconds
- Polls LCU API at https://127.0.0.1:2999/liveclientdata/allgamedata
- Events: 'gameStarted', 'gameEnded', 'clientDetected'
- Can read League lockfile for LCU credentials
- Handles self-signed certificate (rejectUnauthorized: false)

**riotAPI.js**
- Wrapper for Riot Games API
- Configured for NA region (na1)
- Uses americas routing for account/match APIs
- Methods:
  - getAccountByPuuid(puuid)
  - getAccountByRiotId(gameName, tagLine)
  - getSummonerByPuuid(puuid)
  - getActiveGame(puuid) - gets current game data
  - getMatchHistory(puuid, count)
  - getMatch(matchId)
  - validateApiKey()
- Handles 404 (not in game) gracefully

**voiceManager.js**
- Manages voice connection lifecycle
- Socket.io client connecting to backend
- Agora SDK integration (currently stubbed)
- Methods:
  - findOrCreateChannel(gameInfo) - request channel from backend
  - joinChannel(channelInfo) - join Agora voice
  - leaveChannel() - disconnect from voice
  - toggleMute() - mute microphone
  - toggleDeafen() - mute mic + speakers
- Events: 'backend-connected', 'channel-ready', 'user-joined', 'user-left'

### 🖥️ BACKEND (server/)

**server/index.js**
- Express + Socket.io server
- Port 3001 (configurable via .env)
- CORS enabled for Electron app

**Data Structures:**
```javascript
activeUsers: Map<puuid, {
  socketId: string,
  currentChannel: string | null,
  riotId: string,
  connectedAt: number
}>

activeChannels: Map<channelId, {
  channelId: string,
  channelName: string,
  gameId: number,
  teamId: 100 | 200,
  users: string[],
  agoraAppId: string,
  agoraToken: string | null,
  createdAt: number
}>

gameChannels: Map<gameId_teamId, channelId>
```

**Socket.io Events:**
- `register-user`: Store user in activeUsers
- `find-or-create-channel`: Match teammates, create/find channel
- `join-channel`: Add user to channel, notify others
- `leave-channel`: Remove user, cleanup if empty
- `disconnect`: Clean up user from all channels

**Features:**
- Real-time user presence
- Automatic teammate matching
- Channel lifecycle management
- Agora token generation (placeholder)
- Periodic cleanup (every 5 min)
- Riot API key verification on startup

### 📝 DOCUMENTATION

**README.md** (8000+ words)
- Complete feature overview
- Tech stack explanation
- Prerequisites & setup instructions
- How it works (detailed flow)
- Riot API & Agora setup
- Usage guide
- Limitations & TODOs
- Troubleshooting section
- Development guide
- Security notes
- Resources & links

**QUICKSTART.md** (Fast Setup)
- Checklist of prerequisites
- Step-by-step 5-minute setup
- API key instructions
- Run commands
- Testing steps
- Quick troubleshooting

**PROJECT_SUMMARY.md** (Technical Deep Dive)
- Architecture explanation
- Data flow diagrams (text-based)
- Key technologies
- Data structures
- Socket.io event reference
- Configuration requirements
- Current limitations
- Security considerations
- Performance notes
- Testing strategy
- Production roadmap
- Time estimates

**ARCHITECTURE.md** (Visual Reference)
- ASCII art system diagram
- Component relationships
- Data flow examples
- Communication patterns
- Network ports & protocols
- Security layers
- Scalability considerations

## Dependencies

### Electron App (package.json)
```json
{
  "devDependencies": {
    "electron": "^27.0.0"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "https": "^1.0.0",
    "socket.io-client": "^4.7.0",
    "agora-electron-sdk": "^4.2.0"
  }
}
```

### Backend Server (server/package.json)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Environment Configuration

**server/.env.example**
```env
RIOT_API_KEY=YOUR_RIOT_API_KEY_HERE
AGORA_APP_ID=YOUR_AGORA_APP_ID
AGORA_APP_CERTIFICATE=YOUR_AGORA_CERTIFICATE
PORT=3001
BACKEND_URL=http://localhost:3001
```

## NPM Scripts

**Root package.json:**
- `npm start` - Run Electron app
- `npm run dev` - Run Electron with DevTools
- `npm run server` - Run backend server

**server/package.json:**
- `npm start` - Run server (production)
- `npm run dev` - Run server with nodemon (auto-restart)

## Port Usage

- **3001**: Backend HTTP + WebSocket server
- **2999**: League Client LCU API (local HTTPS)
- **Dynamic**: Agora WebRTC (UDP ports, handled by SDK)

## File Sizes (Approximate)

- Source files: ~100 KB
- Documentation: ~80 KB
- node_modules (after install): ~200 MB
- Total project (with dependencies): ~200 MB

## Git Ignore Rules (.gitignore)

Protects:
- node_modules/
- .env files (API keys)
- Build output
- OS files (.DS_Store)
- IDE files (.vscode, .idea)
- Log files

## Critical Features by File

| Feature | Primary File(s) |
|---------|----------------|
| Game Detection | gameDetector.js |
| Riot API Integration | riotAPI.js |
| Voice Management | voiceManager.js |
| User Interface | index.html + renderer.js |
| Backend Logic | server/index.js |
| Security | preload.js |
| App Lifecycle | main.js |
| Channel Matching | server/index.js |
| Team Discovery | server/index.js |

## Next Implementation Priority

1. **Riot OAuth** (main.js + server/index.js)
2. **Agora Integration** (voiceManager.js)
3. **Token Generation** (server/index.js)
4. **Error Handling** (all files)
5. **Reconnection Logic** (voiceManager.js + server/index.js)

---

This is the complete structure! Every file has a specific purpose and they all work together to create the auto-join voice chat experience.
