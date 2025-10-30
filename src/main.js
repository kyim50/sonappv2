const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const GameDetector = require('./services/gameDetector');
const RiotAPI = require('./services/riotAPI');
const VoiceManager = require('./services/voiceManager');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

let mainWindow;
let gameDetector;
let riotAPI;
let voiceManager;

// User data
const userData = {
  puuid: null,
  summonerName: null,
  riotId: null
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: false,
    title: 'LOL Voice Chat'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // Initialize services
  gameDetector = new GameDetector();
  riotAPI = new RiotAPI();
  voiceManager = new VoiceManager();

  // Start monitoring
  gameDetector.startMonitoring();

  // Set up event handlers
  setupEventHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Cleanup
    if (gameDetector) {
      gameDetector.stopMonitoring();
    }
    if (voiceManager) {
      voiceManager.disconnect();
    }
    app.quit();
  }
});

function setupEventHandlers() {
  // Game detector events
  gameDetector.on('clientDetected', (isRunning) => {
    mainWindow.webContents.send('league-status', { running: isRunning });
  });

  gameDetector.on('gameStarted', async (gameData) => {
    console.log('Game started!', gameData);
    
    try {
      // Get current game info from Riot API
      const gameInfo = await riotAPI.getCurrentGame(userData.puuid);
      
      if (!gameInfo || !gameInfo.participants) {
        console.log('Could not get game info from Riot API');
        mainWindow.webContents.send('game-status', { inGame: false });
        return;
      }

      // Find teammates on the same team
      const playerInfo = gameInfo.participants.find(p => p.puuid === userData.puuid);
      if (!playerInfo) {
        console.log('Player not found in game');
        mainWindow.webContents.send('game-status', { inGame: false });
        return;
      }

      const teammates = gameInfo.participants.filter(p => 
        p.teamId === playerInfo.teamId && p.puuid !== userData.puuid
      );

      console.log('Teammates:', teammates);

      // Update UI - in game
      mainWindow.webContents.send('game-status', { 
        inGame: true,
        gameId: gameInfo.gameId,
        teammates: teammates.length
      });

      // Request voice channel from backend
      const channelInfo = await voiceManager.findOrCreateChannel({
        gameId: gameInfo.gameId,
        teamId: playerInfo.teamId,
        participants: gameInfo.participants,
        userPuuid: userData.puuid
      });

      console.log('Channel info received:', channelInfo);

      // Check if we got a valid response
      if (!channelInfo || !channelInfo.success) {
        console.error('Failed to create/find channel:', channelInfo?.error || 'Unknown error');
        mainWindow.webContents.send('voice-status', { 
          status: 'error',
          message: 'Failed to create voice channel'
        });
        return;
      }

      // Join the voice channel
      const joinResult = await voiceManager.joinChannel({
        channelId: channelInfo.channelId,
        channelName: channelInfo.channelName,
        agoraAppId: channelInfo.agoraAppId,
        agoraToken: channelInfo.agoraToken,
        userPuuid: userData.puuid
      });

      console.log('Joined voice channel:', channelInfo.channelName);

      // Update UI
      mainWindow.webContents.send('voice-status', { 
        status: 'connected',
        channelId: channelInfo.channelId,
        teammates: channelInfo.connectedTeammates || 0,
        sdkAvailable: joinResult !== false
      });

    } catch (error) {
      console.error('Error handling game start:', error);
      mainWindow.webContents.send('voice-status', { 
        status: 'error',
        message: error.message
      });
    }
  });

  gameDetector.on('gameEnded', async () => {
    console.log('Game ended');
    
    // Leave voice channel
    if (voiceManager.currentChannel) {
      await voiceManager.leaveChannel();
    }

    mainWindow.webContents.send('game-status', { inGame: false });
    mainWindow.webContents.send('voice-status', { status: 'disconnected' });
  });

  // Voice manager events
  voiceManager.on('backend-connected', () => {
    console.log('Backend connection established');
    mainWindow.webContents.send('backend-status', { connected: true });
  });

  voiceManager.on('backend-disconnected', () => {
    console.log('Backend connection lost');
    mainWindow.webContents.send('backend-status', { connected: false });
  });

  voiceManager.on('agora-user-joined', (uid) => {
    console.log('Teammate joined voice:', uid);
    mainWindow.webContents.send('teammate-joined-voice', { uid });
  });

  voiceManager.on('agora-user-left', (uid) => {
    console.log('Teammate left voice:', uid);
    mainWindow.webContents.send('teammate-left-voice', { uid });
  });

  voiceManager.on('mute-changed', (isMuted) => {
    mainWindow.webContents.send('mute-status', { muted: isMuted });
  });

  voiceManager.on('deafen-changed', (isDeafened) => {
    mainWindow.webContents.send('deafen-status', { deafened: isDeafened });
  });
}

// IPC Handlers
ipcMain.handle('login', async (event, credentials) => {
  try {
    const { gameName, tagLine, riotId } = credentials;
    
    console.log(`Attempting login for: ${gameName}#${tagLine}`);
    
    // Get account info from Riot API using gameName and tagLine
    const accountInfo = await riotAPI.getAccountByRiotId(gameName, tagLine);
    
    if (accountInfo && accountInfo.puuid) {
      // Store the real account data
      userData.puuid = accountInfo.puuid;
      userData.riotId = `${accountInfo.gameName}#${accountInfo.tagLine}`;
      userData.summonerName = accountInfo.gameName;
      
      console.log(`Login successful! PUUID: ${userData.puuid}`);

      // Register with backend
      voiceManager.socket.emit('register-user', {
        puuid: userData.puuid,
        riotId: userData.riotId
      });
      
      return { 
        success: true, 
        user: {
          puuid: userData.puuid,
          riotId: userData.riotId,
          gameName: accountInfo.gameName,
          tagLine: accountInfo.tagLine
        }
      };
    } else {
      return { success: false, error: 'Account not found' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-mute', async () => {
  try {
    const isMuted = voiceManager.toggleMute();
    return { success: true, muted: isMuted };
  } catch (error) {
    console.error('Error toggling mute:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-deafen', async () => {
  try {
    const isDeafened = voiceManager.toggleDeafen();
    return { success: true, deafened: isDeafened };
  } catch (error) {
    console.error('Error toggling deafen:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('leave-voice', async () => {
  try {
    await voiceManager.leaveChannel();
    return { success: true };
  } catch (error) {
    console.error('Error leaving voice:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-voice-status', async () => {
  try {
    const status = voiceManager.getStatus();
    return { success: true, status };
  } catch (error) {
    console.error('Error getting voice status:', error);
    return { success: false, error: error.message };
  }
});