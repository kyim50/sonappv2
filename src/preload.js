const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Login
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  
  // Get user info
  getUser: () => ipcRenderer.invoke('get-user'),
  
  // Voice controls
  toggleMute: () => ipcRenderer.invoke('toggle-mute'),
  toggleDeafen: () => ipcRenderer.invoke('toggle-deafen'),
  leaveVoice: () => ipcRenderer.invoke('leave-voice'),
  getVoiceStatus: () => ipcRenderer.invoke('get-voice-status'),
  
  // Event listeners (one-way from main to renderer)
  on: (channel, callback) => {
    const validChannels = [
      'league-status',
      'game-status',
      'voice-status',
      'backend-status',
      'mute-status',
      'deafen-status',
      'teammate-joined-voice',
      'teammate-left-voice'
    ];
    
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Remove event listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});