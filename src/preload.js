const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // User authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  getUser: () => ipcRenderer.invoke('get-user'),
  
  // Voice controls
  toggleMute: () => ipcRenderer.invoke('toggle-mute'),
  toggleDeafen: () => ipcRenderer.invoke('toggle-deafen'),
  leaveVoice: () => ipcRenderer.invoke('leave-voice'),
  
  // Event listeners
  onGameState: (callback) => {
    ipcRenderer.on('game-state', (event, data) => callback(data));
  },
  onClientStatus: (callback) => {
    ipcRenderer.on('client-status', (event, data) => callback(data));
  },
  onVoiceJoined: (callback) => {
    ipcRenderer.on('voice-joined', (event, data) => callback(data));
  },
  onError: (callback) => {
    ipcRenderer.on('error', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
