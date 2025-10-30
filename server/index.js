const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3001;

// Riot API configuration
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'na1';
const RIOT_PLATFORM_URL = `https://${RIOT_REGION}.api.riotgames.com`;

// Agora configuration
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const AGORA_REST_KEY = process.env.AGORA_REST_KEY;
const AGORA_REST_SECRET = process.env.AGORA_REST_SECRET;

// Import Agora token generator
const AgoraTokenGenerator = require('./agoraTokenGenerator');
const tokenGenerator = new AgoraTokenGenerator(AGORA_APP_ID, AGORA_APP_CERTIFICATE);

// In-memory storage
const activeUsers = new Map(); // puuid -> { socketId, riotId, currentGameId, currentChannel }
const activeChannels = new Map(); // channelId -> { gameId, teamId, users: [puuid], createdAt }
const gameChannels = new Map(); // gameId_teamId -> channelId

// Helper function to verify Riot API
async function verifyRiotAPI() {
  try {
    const response = await axios.get(
      'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/test/NA1',
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        },
        validateStatus: (status) => status === 404 || status === 200
      }
    );
    
    console.log('✓ Riot API key verified');
    return true;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 401) {
      console.log('⚠️  Warning: Riot API key verification failed');
      console.log('   Your API key might be invalid or expired');
      console.log('   Get a new one from: https://developer.riotgames.com/');
      return false;
    }
    console.log('✓ Riot API key verified');
    return true;
  }
}

// REST API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size,
    activeChannels: activeChannels.size
  });
});

// Get account by Riot ID
app.get('/api/account/:gameName/:tagLine', async (req, res) => {
  try {
    const { gameName, tagLine } = req.params;
    
    const response = await axios.get(
      `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching account:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data || 'Failed to fetch account' 
    });
  }
});

// Get current game by PUUID
app.get('/api/spectator/:puuid', async (req, res) => {
  try {
    const { puuid } = req.params;
    
    const response = await axios.get(
      `${RIOT_PLATFORM_URL}/lol/spectator/v5/active-games/by-summoner/${puuid}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Not in game' });
    } else {
      console.error('Error fetching game:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: error.response?.data || 'Failed to fetch game' 
      });
    }
  }
});

// WebSocket handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // User registration
  socket.on('register-user', (userData) => {
    const { puuid, riotId } = userData;
    
    activeUsers.set(puuid, {
      socketId: socket.id,
      riotId: riotId,
      currentGameId: null,
      currentChannel: null
    });

    console.log(`User registered: ${riotId} (${puuid})`);
    socket.emit('registration-confirmed', { puuid, riotId });
  });

  // Find or create voice channel for a game
  socket.on('find-or-create-channel', async (gameInfo, callback) => {
    try {
      const { gameId, teamId, participants, userPuuid } = gameInfo;
      
      console.log(`Finding or creating channel for game: ${gameId}, team: ${teamId}`);

      // Check if channel already exists for this game+team
      const channelKey = `${gameId}_${teamId}`;
      let channelId = gameChannels.get(channelKey);
      let channel;

      if (channelId && activeChannels.has(channelId)) {
        // Channel exists
        channel = activeChannels.get(channelId);
        console.log(`Using existing channel: ${channelId}`);
      } else {
        // Create new channel
        channelId = `${gameId}_${teamId}_${Date.now()}`;
        channel = {
          gameId,
          teamId,
          users: [],
          createdAt: Date.now()
        };
        
        activeChannels.set(channelId, channel);
        gameChannels.set(channelKey, channelId);
        
        console.log(`Created new channel: ${channelId}`);
      }

      // Find teammates who are using the app
      const teammates = participants.filter(p => 
        p.puuid !== userPuuid && activeUsers.has(p.puuid)
      );

      console.log(`Found ${teammates.length} teammates using the app`);

      // Generate Agora token (if needed)
      const agoraToken = tokenGenerator.generateToken(channelId, userPuuid);

      // Update user's current game
      const user = activeUsers.get(userPuuid);
      if (user) {
        user.currentGameId = gameId;
      }

      callback({
        success: true,
        channelId: channelId,
        channelName: channelId,
        agoraAppId: AGORA_APP_ID,
        agoraToken: agoraToken,
        userPuuid: userPuuid,
        connectedTeammates: teammates.length
      });

      // Notify teammates about the channel
      teammates.forEach(teammate => {
        const teammateUser = activeUsers.get(teammate.puuid);
        if (teammateUser) {
          io.to(teammateUser.socketId).emit('channel-created', {
            channelId,
            channelName: channelId,
            agoraAppId: AGORA_APP_ID,
            agoraToken: tokenGenerator.generateToken(channelId, teammate.puuid),
            userPuuid: teammate.puuid
          });
        }
      });

    } catch (error) {
      console.error('Error finding/creating channel:', error);
      callback({ success: false, error: error.message });
    }
  });

  // User joins a voice channel
  socket.on('join-channel', (data) => {
    const { channelId, userPuuid } = data;

    const channel = activeChannels.get(channelId);
    if (channel) {
      // Add user to channel if not already there
      if (!channel.users.includes(userPuuid)) {
        channel.users.push(userPuuid);
      }

      // Update user's current channel
      const user = activeUsers.get(userPuuid);
      if (user) {
        user.currentChannel = channelId;
      }

      // Join socket room for this channel
      socket.join(channelId);

      // Notify others in the channel
      socket.to(channelId).emit('user-joined-channel', {
        userPuuid,
        riotId: user?.riotId
      });

      console.log(`User ${userPuuid} joined channel ${channelId}`);
    }
  });

  // User leaves a voice channel
  socket.on('leave-channel', (data) => {
    const { channelId } = data;

    const channel = activeChannels.get(channelId);
    if (channel) {
      // Find user by socket ID
      let userPuuid = null;
      for (const [puuid, user] of activeUsers.entries()) {
        if (user.socketId === socket.id) {
          userPuuid = puuid;
          break;
        }
      }

      if (userPuuid) {
        // Remove user from channel
        channel.users = channel.users.filter(u => u !== userPuuid);
      }

      // Update user's current channel
      const user = activeUsers.get(userPuuid);
      if (user) {
        user.currentChannel = null;
      }

      // Leave socket room
      socket.leave(channelId);

      // Notify others
      socket.to(channelId).emit('user-left-channel', {
        userPuuid,
        riotId: user?.riotId
      });

      console.log(`User ${userPuuid} left channel ${channelId}`);

      // Clean up empty channels
      if (channel.users.length === 0) {
        activeChannels.delete(channelId);
        gameChannels.delete(`${channel.gameId}_${channel.teamId}`);
        console.log(`Deleted empty channel: ${channelId}`);
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Find and remove user
    for (const [puuid, user] of activeUsers.entries()) {
      if (user.socketId === socket.id) {
        // Leave any active channel
        if (user.currentChannel) {
          const channel = activeChannels.get(user.currentChannel);
          if (channel) {
            channel.users = channel.users.filter(u => u !== puuid);
            
            // Notify others
            socket.to(user.currentChannel).emit('user-left-channel', {
              userPuuid: puuid,
              riotId: user.riotId
            });

            // Clean up empty channel
            if (channel.users.length === 0) {
              activeChannels.delete(user.currentChannel);
              gameChannels.delete(`${channel.gameId}_${channel.teamId}`);
            }
          }
        }

        // Remove user
        activeUsers.delete(puuid);
        console.log(`Removed user: ${user.riotId}`);
        break;
      }
    }
  });
});

// Cleanup old channels (run every 30 minutes)
setInterval(() => {
  const now = Date.now();
  const CHANNEL_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

  for (const [channelId, channel] of activeChannels.entries()) {
    if (now - channel.createdAt > CHANNEL_TIMEOUT) {
      console.log(`Cleaning up old channel: ${channelId}`);
      activeChannels.delete(channelId);
      gameChannels.delete(`${channel.gameId}_${channel.teamId}`);
    }
  }
}, 30 * 60 * 1000);

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   Local: http://localhost:${PORT}/health`);
  
  // Get local IP address
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'Unknown';
  
  // Find the local network IP
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
      }
    });
  });
  
  console.log(`   Network: http://${localIP}:${PORT}/health`);
  console.log(`\n   📡 Share this URL with friends: http://${localIP}:${PORT}`);
  
  // Validate Riot API key
  if (RIOT_API_KEY && RIOT_API_KEY !== 'YOUR_RIOT_API_KEY_HERE') {
    const isValid = await verifyRiotAPI();
    if (isValid) {
      console.log('✅ Riot API key verified and working');
    }
  } else {
    console.log('⚠️  Warning: Riot API key not configured');
    console.log('   Add RIOT_API_KEY to server/.env file');
  }

  // Check Agora configuration
  if (AGORA_APP_ID && AGORA_APP_ID !== 'YOUR_AGORA_APP_ID') {
    console.log('✅ Agora App ID configured');
    console.log(`   App ID: ${AGORA_APP_ID}`);
    
    if (AGORA_APP_CERTIFICATE) {
      console.log('✅ Agora Certificate configured');
      console.log('   ⚠️  Make sure "App ID + Token" mode is enabled in Agora console');
      console.log('   OR enable "App ID only" mode for testing');
    }
    
    if (AGORA_REST_KEY && AGORA_REST_SECRET) {
      console.log('✅ Agora RESTful API credentials configured');
    }
  } else {
    console.log('⚠️  Warning: Agora credentials not configured');
    console.log('   Add AGORA_APP_ID and AGORA_APP_CERTIFICATE to server/.env');
  }
  
  console.log('\n📱 Ready for connections!');
  console.log('   Start the Electron app with: npm start\n');
});