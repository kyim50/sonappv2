// Socket.io connection to backend
const socket = io('http://localhost:3001');

// DOM elements
let currentUser = null;

// Socket connection status
socket.on('connect', () => {
  console.log('Connected to backend server');
  updateBackendStatus(true);
});

socket.on('disconnect', () => {
  console.log('Disconnected from backend server');
  updateBackendStatus(false);
});

function updateBackendStatus(connected) {
  const backendStatus = document.getElementById('backend-status');
  const backendIndicator = document.getElementById('backend-indicator');
  
  if (connected) {
    backendStatus.textContent = 'Connected';
    backendStatus.style.color = '#4ade80';
    backendIndicator.style.backgroundColor = '#4ade80';
  } else {
    backendStatus.textContent = 'Disconnected';
    backendStatus.style.color = '#ef4444';
    backendIndicator.style.backgroundColor = '#ef4444';
  }
}

// Login functionality
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const riotIdInput = document.getElementById('riot-id').value.trim();
  const errorDiv = document.getElementById('login-error');
  const submitButton = e.target.querySelector('button[type="submit"]');
  
  // Clear previous errors
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';
  
  // Validate input
  if (!riotIdInput.includes('#')) {
    errorDiv.textContent = 'Please enter your Riot ID in the format: GameName#TagLine';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Parse Riot ID
  const [gameName, tagLine] = riotIdInput.split('#');
  
  if (!gameName || !tagLine) {
    errorDiv.textContent = 'Invalid Riot ID format. Use: GameName#TagLine';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Disable button and show loading
  submitButton.disabled = true;
  submitButton.textContent = 'Logging in...';
  
  try {
    const result = await window.api.login({
      gameName: gameName.trim(),
      tagLine: tagLine.trim(),
      riotId: riotIdInput
    });
    
    if (result.success) {
      currentUser = result.user;
      
      // Hide login screen, show main app
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-screen').style.display = 'flex';
      
      // Update UI with user info
      document.getElementById('summoner-name').textContent = result.user.riotId;
      
    } else {
      errorDiv.textContent = result.error || 'Login failed. Please check your Riot ID and try again.';
      errorDiv.style.display = 'block';
      submitButton.disabled = false;
      submitButton.textContent = 'Login';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = 'An error occurred. Please try again.';
    errorDiv.style.display = 'block';
    submitButton.disabled = false;
    submitButton.textContent = 'Login';
  }
});

// League client status
window.api.on('league-status', (data) => {
  console.log('League status update:', data);
  const leagueStatus = document.getElementById('league-status');
  const leagueIndicator = document.getElementById('league-indicator');
  
  if (data.running) {
    leagueStatus.textContent = 'Running';
    leagueStatus.style.color = '#4ade80';
    leagueIndicator.style.backgroundColor = '#4ade80';
  } else {
    leagueStatus.textContent = 'Not Running';
    leagueStatus.style.color = '#ef4444';
    leagueIndicator.style.backgroundColor = '#ef4444';
  }
});

// Game status
window.api.on('game-status', (data) => {
  console.log('Game status update:', data);
  const gameStatus = document.getElementById('game-status');
  
  if (data.inGame) {
    gameStatus.textContent = 'In Game';
    gameStatus.style.color = '#4ade80';
  } else {
    gameStatus.textContent = 'Not in Game';
    gameStatus.style.color = '#94a3b8';
  }
});

// Backend status
window.api.on('backend-status', (data) => {
  updateBackendStatus(data.connected);
});

// Voice status
window.api.on('voice-status', (data) => {
  console.log('Voice status update:', data);
  const voiceContainer = document.getElementById('voice-container');
  const voiceStatus = document.getElementById('voice-status');
  const teammateCount = document.getElementById('teammate-count');
  
  if (data.status === 'connected') {
    voiceContainer.style.display = 'block';
    voiceStatus.textContent = 'Voice Chat Active';
    voiceStatus.style.color = '#4ade80';
    
    if (data.teammates !== undefined) {
      teammateCount.textContent = `${data.teammates} teammate${data.teammates !== 1 ? 's' : ''} connected`;
    }
    
    // Show SDK warning if not available
    if (data.sdkAvailable === false) {
      voiceStatus.textContent = 'Voice Chat Active (SDK not installed)';
      voiceStatus.style.color = '#f59e0b';
    }
  } else if (data.status === 'error') {
    voiceContainer.style.display = 'block';
    voiceStatus.textContent = `Error: ${data.message || 'Unknown error'}`;
    voiceStatus.style.color = '#ef4444';
  } else {
    voiceContainer.style.display = 'none';
  }
});

// Mute status
window.api.on('mute-status', (data) => {
  const muteButton = document.getElementById('mute-button');
  if (data.muted) {
    muteButton.textContent = '🔇 Unmute';
    muteButton.style.backgroundColor = '#ef4444';
  } else {
    muteButton.textContent = '🎤 Mute';
    muteButton.style.backgroundColor = '#64748b';
  }
});

// Deafen status
window.api.on('deafen-status', (data) => {
  const deafenButton = document.getElementById('deafen-button');
  if (data.deafened) {
    deafenButton.textContent = '🔊 Undeafen';
    deafenButton.style.backgroundColor = '#ef4444';
  } else {
    deafenButton.textContent = '🔇 Deafen';
    deafenButton.style.backgroundColor = '#64748b';
  }
});

// Voice controls
document.getElementById('mute-button')?.addEventListener('click', async () => {
  try {
    await window.api.toggleMute();
  } catch (error) {
    console.error('Error toggling mute:', error);
  }
});

document.getElementById('deafen-button')?.addEventListener('click', async () => {
  try {
    await window.api.toggleDeafen();
  } catch (error) {
    console.error('Error toggling deafen:', error);
  }
});

document.getElementById('leave-button')?.addEventListener('click', async () => {
  try {
    await window.api.leaveVoice();
    document.getElementById('voice-container').style.display = 'none';
  } catch (error) {
    console.error('Error leaving voice:', error);
  }
});

// Load user on startup (if already logged in)
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await window.api.getUser();
    if (result.success && result.user) {
      currentUser = result.user;
      
      // Hide login screen, show main app
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-screen').style.display = 'flex';
      
      // Update UI
      document.getElementById('summoner-name').textContent = result.user.riotId;
    }
  } catch (error) {
    console.error('Error loading user:', error);
  }
});