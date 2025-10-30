# System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           USER'S COMPUTER                                     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ELECTRON APP (Desktop)                            │    │
│  │                                                                      │    │
│  │  ┌────────────────┐         ┌──────────────────────────────────┐   │    │
│  │  │  Renderer      │   IPC   │    Main Process                 │   │    │
│  │  │  (HTML/CSS/JS) │◄───────►│    (Node.js)                    │   │    │
│  │  │                │         │                                  │   │    │
│  │  │  • UI Display  │         │  ┌────────────────────────────┐ │   │    │
│  │  │  • User Input  │         │  │  Game Detector Service     │ │   │    │
│  │  │  • Voice UI    │         │  │  • Monitor League process  │ │   │    │
│  │  └────────────────┘         │  │  • Poll LCU API            │ │   │    │
│  │         │                    │  │  • Detect game state       │ │   │    │
│  │         │                    │  └────────────────────────────┘ │   │    │
│  │         │                    │  ┌────────────────────────────┐ │   │    │
│  │         │                    │  │  Riot API Service          │ │   │    │
│  │         │                    │  │  • Query active games      │ │   │    │
│  │         │                    │  │  • Get account info        │ │   │    │
│  │         │                    │  │  • Match history           │ │   │    │
│  │         │                    │  └────────────────────────────┘ │   │    │
│  │         │                    │  ┌────────────────────────────┐ │   │    │
│  │         │                    │  │  Voice Manager             │ │   │    │
│  │         │                    │  │  • Agora SDK wrapper       │ │   │    │
│  │         │                    │  │  • WebSocket to backend    │ │   │    │
│  │         │                    │  │  • Mute/Deafen controls    │ │   │    │
│  │         │                    │  └────────────────────────────┘ │   │    │
│  │         │                    │           │                      │   │    │
│  │         └────────────────────┴───────────┘                      │   │    │
│  └──────────────────────│────────────────────────────────────────────┘    │
│                         │                                                   │
│  ┌──────────────────────┼───────────────────────────────────────────────┐ │
│  │    League Client     │                                                │ │
│  │                      │                                                │ │
│  │  ┌──────────────────▼────────────────┐                              │ │
│  │  │  LCU API (Local REST)              │                              │ │
│  │  │  https://127.0.0.1:2999            │                              │ │
│  │  │                                    │                              │ │
│  │  │  GET /liveclientdata/allgamedata  │                              │ │
│  │  │  → Returns current game info       │                              │ │
│  │  └────────────────────────────────────┘                              │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────────────────────┘
                            │
                            │ WebSocket (Socket.io)
                            │
┌───────────────────────────▼──────────────────────────────────────────────────┐
│                         BACKEND SERVER                                        │
│                      (Node.js + Express)                                      │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       Express HTTP Server                            │    │
│  │                       Port: 3001                                     │    │
│  └──────────────────────────────┬───────────────────────────────────────┘    │
│                                 │                                             │
│  ┌──────────────────────────────▼───────────────────────────────────────┐    │
│  │                    Socket.io WebSocket Server                        │    │
│  │                                                                      │    │
│  │  Events:                                                             │    │
│  │  • register-user           → Store user in activeUsers               │    │
│  │  • find-or-create-channel  → Match teammates, create channel         │    │
│  │  • join-channel            → Add user to channel                     │    │
│  │  • leave-channel           → Remove user from channel                │    │
│  └──────────────────────────────┬───────────────────────────────────────┘    │
│                                 │                                             │
│  ┌──────────────────────────────▼───────────────────────────────────────┐    │
│  │                      In-Memory Data Stores                           │    │
│  │                                                                      │    │
│  │  • activeUsers (Map)                                                 │    │
│  │    └─► puuid → { socketId, currentChannel, riotId }                 │    │
│  │                                                                      │    │
│  │  • activeChannels (Map)                                              │    │
│  │    └─► channelId → { gameId, teamId, users[], agoraInfo }           │    │
│  │                                                                      │    │
│  │  • gameChannels (Map)                                                │    │
│  │    └─► "gameId_teamId" → channelId                                  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬───────────┬──────────────────────────────────────┘
                            │           │
                ┌───────────┘           └────────────┐
                │                                    │
                │ HTTPS                              │ HTTPS
                │                                    │
┌───────────────▼─────────────────┐    ┌────────────▼──────────────────────┐
│     Riot Games API              │    │      Agora.io                     │
│     https://na1.api.riotgames   │    │      Voice Service                │
│                                 │    │                                   │
│  Endpoints:                     │    │  • WebRTC Voice                   │
│  • GET /account/by-puuid        │    │  • Token Generation               │
│  • GET /active-games            │    │  • Audio Streams                  │
│  • GET /summoner/by-puuid       │    │  • Low Latency (<100ms)           │
│                                 │    │                                   │
│  Rate Limits:                   │    │  Free Tier:                       │
│  • 20 req/sec                   │    │  • 10,000 min/month               │
│  • 100 req/2min                 │    │                                   │
└─────────────────────────────────┘    └───────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
                               DATA FLOW EXAMPLE
═══════════════════════════════════════════════════════════════════════════════

User enters a League game:

1. Game Detector (polls every 3s)
   └─► Detects active game via LCU API

2. Main Process
   └─► Queries Riot API with user's PUUID
   └─► Gets active game data (gameId, participants, teams)

3. WebSocket → Backend
   └─► Sends: { gameId, teamId, userPuuid, teammates[] }

4. Backend
   └─► Checks activeUsers map for teammates with app
   └─► Creates channelId: "gameId_teamId_timestamp"
   └─► Stores in activeChannels map
   └─► Generates Agora token (or uses App ID)

5. Backend → All Matched Teammates
   └─► Emits: 'channel-available' with channel info

6. Each User's App
   └─► Auto-joins Agora voice channel
   └─► Connects to other teammates
   └─► Voice chat active! 🎙️

7. Game Ends
   └─► Game Detector: no active game
   └─► Leave Agora channel
   └─► Backend: cleanup empty channels

═══════════════════════════════════════════════════════════════════════════════
```

## Key Communication Patterns

### 1. Electron IPC (Internal)
```
Renderer Process  ←→  Preload Script  ←→  Main Process
    (UI)              (Security)         (Services)
```

### 2. WebSocket Events (App ↔ Backend)
```
Client                          Server
  │                               │
  ├─── register-user ────────────►│
  │◄─── connected ────────────────┤
  │                               │
  ├─── find-or-create-channel ───►│
  │                               ├─ Check activeUsers
  │                               ├─ Create channel
  │◄─── channel-created ──────────┤
  │                               │
  ├─── join-channel ─────────────►│
  │◄─── user-joined-channel ──────┤
```

### 3. REST API Calls (Backend → Riot)
```
Backend                     Riot API
  │                            │
  ├─ GET active-games ────────►│
  │◄─ { gameId, participants }─┤
  │                            │
  ├─ GET account-by-puuid ────►│
  │◄─ { gameName, tagLine } ───┤
```

### 4. Voice Connection (App ↔ Agora)
```
User A App          Agora Cloud         User B App
    │                    │                   │
    ├─ join(channel) ───►│                   │
    │                    │◄─ join(channel) ──┤
    │                    │                   │
    │◄─── RTC Stream ────┼──── RTC Stream ──►│
    │     (audio)        │      (audio)      │
```

## Network Ports & Protocols

- **LCU API**: `https://127.0.0.1:2999` (self-signed cert)
- **Backend Server**: `http://localhost:3001` (WebSocket + HTTP)
- **Riot API**: `https://na1.api.riotgames.com` (HTTPS)
- **Agora**: Multiple UDP ports for WebRTC (handled by SDK)

## Security Layers

1. **Electron Context Isolation**: Renderer can't access Node.js directly
2. **Preload Script**: Whitelist only necessary IPC methods
3. **Riot API Key**: Stored in environment variables (never in code)
4. **Agora Tokens**: Generated server-side (in production)
5. **WebSocket**: Can add authentication tokens (not yet implemented)

## Scalability Considerations

**Current (Single Server):**
- Supports ~100 concurrent users
- In-memory storage (lost on restart)
- Single point of failure

**For Production:**
```
                   Load Balancer
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    Server 1        Server 2        Server 3
        │               │               │
        └───────────────┼───────────────┘
                        │
                    Redis (Shared State)
                        │
                    PostgreSQL (Persistent Storage)
```
