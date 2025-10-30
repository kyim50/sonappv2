require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Store active users and channels
const activeUsers = new Map(); // puuid -> { socketId, currentChannel, riotId }
const activeChannels = new Map(); // channelId -> { gameId, teamId, users: [], agoraInfo }
const gameChannels = new Map(); // gameId_teamId -> channelId

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

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    activeUsers: activeUsers.size,
    activeChannels: activeChannels.size
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Register user
  socket.on('register-user', (userData, callback) => {
    const { puuid, riotId } = userData;
    
    activeUsers.set(puuid, {
      socketId: socket.id,
      currentChannel: null,
      riotId: riotId,
      connectedAt: Date.now()
    });

    console.log(`User registered: ${riotId} (${puuid})`);
    
    if (callback) {
      callback({ success: true });
    }
  });

  // Find or create channel for a game
  socket.on('find-or-create-channel', async (gameInfo, callback) => {
    try {
      const { gameId, teamId, userPuuid, teammates } = gameInfo;
      const channelKey = `${gameId}_${teamId}`;

      // Check if channel already exists
      let channelId = gameChannels.get(channelKey);
      let channel;

      if (channelId) {
        // Channel exists
        channel = activeChannels.get(channelId);
        console.log(`Found existing channel: ${channelId}`);
      } else {
        // Create new channel
        channelId = `${gameId}_${teamId}_${Date.now()}`;
        
        // Generate Agora token (simplified - in production use proper token generation)
        const agoraToken = generateAgoraToken(channelId, userPuuid);
        
        channel = {
          channelId,
          channelName: channelId,
          gameId,
          teamId,
          users: [],
          agoraAppId: AGORA_APP_ID,
          agoraToken: agoraToken,
          createdAt: Date.now()
        };

        activeChannels.set(channelId, channel);
        gameChannels.set(channelKey, channelId);
        
        console.log(`Created new channel: ${channelId}`);
      }

      // Find which teammates are using the app
      const connectedTeammates = [];
      for (const teammate of teammates) {
        if (activeUsers.has(teammate.puuid)) {
          connectedTeammates.push(teammate);
          
          // Notify teammate about the channel
          const teammateUser = activeUsers.get(teammate.puuid);
          io.to(teammateUser.socketId).emit('channel-available', {
            channelId,
            channelInfo: channel,
            invitedBy: userPuuid
          });
        }
      }

      console.log(`Found ${connectedTeammates.length} teammates using the app`);

      // Return channel info
      if (callback) {
        callback({
          success: true,
          channelId,
          channelName: channel.channelName,
          agoraAppId: channel.agoraAppId,
          agoraToken: channel.agoraToken,
          userPuuid: userPuuid,
          connectedTeammates: connectedTeammates.length
        });
      }
    } catch (error) {
      console.error('Error finding/creating channel:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Join a channel
  socket.on('join-channel', (data) => {
    const { channelId, userPuuid } = data;
    const channel = activeChannels.get(channelId);
    
    if (!channel) {
      socket.emit('error', { message: 'Channel not found' });
      return;
    }

    // Add user to channel
    if (!channel.users.includes(userPuuid)) {
      channel.users.push(userPuuid);
    }

    // Update user's current channel
    const user = activeUsers.get(userPuuid);
    if (user) {
      user.currentChannel = channelId;
    }

    // Join socket room
    socket.join(channelId);

    // Notify others in the channel
    socket.to(channelId).emit('user-joined-channel', {
      userPuuid,
      riotId: user?.riotId
    });

    console.log(`User ${userPuuid} joined channel ${channelId}`);
  });

  // Leave a channel
  socket.on('leave-channel', (data) => {
    const { channelId } = data;
    const channel = activeChannels.get(channelId);
    
    if (!channel) return;

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

        activeUsers.delete(puuid);
        console.log(`User ${puuid} removed from active users`);
        break;
      }
    }
  });
});

// Generate Agora token
function generateAgoraToken(channelName, uid) {
  // Use the token generator
  const token = tokenGenerator.generateToken(channelName, uid);
  
  // Returns null for "App ID only" mode (testing)
  // For production, implement proper token generation in agoraTokenGenerator.js
  return token;
}

// Verify Riot API key on startup
async function verifyRiotAPI() {
  try {
    const response = await axios.get(
      `${RIOT_PLATFORM_URL}/lol/status/v4/platform-data`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        }
      }
    );
    console.log('✓ Riot API key verified');
    return true;
  } catch (error) {
    console.error('✗ Riot API key verification failed:', error.response?.data || error.message);
    console.error('Please set RIOT_API_KEY in .env file');
    return false;
  }
}

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  
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

// Cleanup old channels periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [channelId, channel] of activeChannels.entries()) {
    if (now - channel.createdAt > maxAge && channel.users.length === 0) {
      activeChannels.delete(channelId);
      gameChannels.delete(`${channel.gameId}_${channel.teamId}`);
      console.log(`Cleaned up old channel: ${channelId}`);
    }
  }
}, 5 * 60 * 1000);
