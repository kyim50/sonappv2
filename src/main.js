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

// User data (in production, store this securely)
let userData = {
  puuid: null,
  summonerName: null,
  riotId: null, // gameName#tagLine
  accessToken: null
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    resizable: false,
    frame: true
  });

  mainWindow.loadFile('src/renderer/index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  initializeServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function initializeServices() {
  gameDetector = new GameDetector();
  riotAPI = new RiotAPI('na1'); // NA region
  voiceManager = new VoiceManager();

  // Start detecting League client
  gameDetector.startMonitoring();

  // Listen for game state changes
  gameDetector.on('gameStarted', async (gameData) => {
    console.log('Game started!', gameData);
    mainWindow.webContents.send('game-state', { inGame: true, gameData });

    if (userData.puuid) {
      await handleGameStart(gameData);
    }
  });

  gameDetector.on('gameEnded', () => {
    console.log('Game ended!');
    mainWindow.webContents.send('game-state', { inGame: false });
    voiceManager.leaveChannel();
  });

  gameDetector.on('clientDetected', (isRunning) => {
    mainWindow.webContents.send('client-status', { running: isRunning });
  });
}

async function handleGameStart(gameData) {
  try {
    // Get active game info from Riot API
    const activeGame = await riotAPI.getActiveGame(userData.puuid);
    
    if (!activeGame) {
      console.log('No active game found in Riot API');
      return;
    }

    // Find user's team
    const playerInfo = activeGame.participants.find(p => p.puuid === userData.puuid);
    const userTeamId = playerInfo.teamId;

    // Get teammates
    const teammates = activeGame.participants.filter(p => 
      p.teamId === userTeamId && p.puuid !== userData.puuid
    );

    console.log('Teammates:', teammates);

    // Send to backend to find other app users
    const channelInfo = await voiceManager.findOrCreateChannel({
      gameId: activeGame.gameId,
      teamId: userTeamId,
      userPuuid: userData.puuid,
      teammates: teammates.map(t => ({
        puuid: t.puuid,
        summonerName: t.riotId
      }))
    });

    if (channelInfo) {
      // Auto-join voice channel
      await voiceManager.joinChannel(channelInfo);
      mainWindow.webContents.send('voice-joined', channelInfo);
    }
  } catch (error) {
    console.error('Error handling game start:', error);
    mainWindow.webContents.send('error', { message: error.message });
  }
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

ipcMain.handle('get-user', () => {
  return userData;
});

ipcMain.handle('toggle-mute', () => {
  return voiceManager.toggleMute();
});

ipcMain.handle('toggle-deafen', () => {
  return voiceManager.toggleDeafen();
});

ipcMain.handle('leave-voice', () => {
  voiceManager.leaveChannel();
  return { success: true };
});