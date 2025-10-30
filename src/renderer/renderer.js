// DOM elements
let currentUser = null;

function updateBackendStatus(connected) {
  const backendStatus = document.getElementById('backend-status');
  const backendIndicator = document.getElementById('backend-indicator');
  
  if (backendStatus && backendIndicator) {
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
}

// Login functionality
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const riotIdInput = document.getElementById('riot-id').value.trim();
  const errorDiv = document.getElementById('login-error');
  const submitButton = e.target.querySelector('button[type="submit"]');
  
  // Clear previous errors
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }
  
  // Validate input
  if (!riotIdInput.includes('#')) {
    if (errorDiv) {
      errorDiv.textContent = 'Please enter your Riot ID in the format: GameName#TagLine';
      errorDiv.style.display = 'block';
    }
    return;
  }
  
  // Parse Riot ID
  const [gameName, tagLine] = riotIdInput.split('#');
  
  if (!gameName || !tagLine) {
    if (errorDiv) {
      errorDiv.textContent = 'Invalid Riot ID format. Use: GameName#TagLine';
      errorDiv.style.display = 'block';
    }
    return;
  }
  
  // Disable button and show loading
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
  }
  
  try {
    console.log('Attempting login...');
    const result = await window.api.login({
      gameName: gameName.trim(),
      tagLine: tagLine.trim(),
      riotId: riotIdInput
    });
    
    console.log('Login result:', result);
    
    if (result.success) {
      currentUser = result.user;
      
      // Hide login screen, show main app
      const loginScreen = document.getElementById('login-screen');
      const appScreen = document.getElementById('app-screen');
      
      if (loginScreen && appScreen) {
        loginScreen.style.display = 'none';
        appScreen.style.display = 'flex';
      }
      
      // Update UI with user info
      const summonerName = document.getElementById('summoner-name');
      if (summonerName) {
        summonerName.textContent = result.user.riotId;
      }
      
    } else {
      if (errorDiv) {
        errorDiv.textContent = result.error || 'Login failed. Please check your Riot ID and try again.';
        errorDiv.style.display = 'block';
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    if (errorDiv) {
      errorDiv.textContent = 'An error occurred. Please try again.';
      errorDiv.style.display = 'block';
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Login';
    }
  }
});

// League client status
window.api.on('league-status', (data) => {
  console.log('League status update:', data);
  const leagueStatus = document.getElementById('league-status');
  const leagueIndicator = document.getElementById('league-indicator');
  
  if (leagueStatus && leagueIndicator) {
    if (data.running) {
      leagueStatus.textContent = 'Running';
      leagueStatus.style.color = '#4ade80';
      leagueIndicator.style.backgroundColor = '#4ade80';
    } else {
      leagueStatus.textContent = 'Not Running';
      leagueStatus.style.color = '#ef4444';
      leagueIndicator.style.backgroundColor = '#ef4444';
    }
  }
});

// Game status
window.api.on('game-status', (data) => {
  console.log('Game status update:', data);
  const gameStatus = document.getElementById('game-status');
  
  if (gameStatus) {
    if (data.inGame) {
      gameStatus.textContent = 'In Game';
      gameStatus.style.color = '#4ade80';
    } else {
      gameStatus.textContent = 'Not in Game';
      gameStatus.style.color = '#94a3b8';
    }
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
  
  if (voiceContainer && voiceStatus) {
    if (data.status === 'connected') {
      voiceContainer.style.display = 'block';
      voiceStatus.textContent = 'Voice Chat Active';
      voiceStatus.style.color = '#4ade80';
      
      if (teammateCount && data.teammates !== undefined) {
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
  }
});

// Mute status
window.api.on('mute-status', (data) => {
  const muteButton = document.getElementById('mute-button');
  if (muteButton) {
    if (data.muted) {
      muteButton.textContent = '🔇 Unmute';
      muteButton.style.backgroundColor = '#ef4444';
    } else {
      muteButton.textContent = '🎤 Mute';
      muteButton.style.backgroundColor = '#64748b';
    }
  }
});

// Deafen status
window.api.on('deafen-status', (data) => {
  const deafenButton = document.getElementById('deafen-button');
  if (deafenButton) {
    if (data.deafened) {
      deafenButton.textContent = '🔊 Undeafen';
      deafenButton.style.backgroundColor = '#ef4444';
    } else {
      deafenButton.textContent = '🔇 Deafen';
      deafenButton.style.backgroundColor = '#64748b';
    }
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
    const voiceContainer = document.getElementById('voice-container');
    if (voiceContainer) {
      voiceContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Error leaving voice:', error);
  }
});

// Load user on startup (if already logged in)
window.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, checking for existing user...');
  try {
    const result = await window.api.getUser();
    console.log('Get user result:', result);
    
    if (result.success && result.user) {
      currentUser = result.user;
      
      // Hide login screen, show main app
      const loginScreen = document.getElementById('login-screen');
      const appScreen = document.getElementById('app-screen');
      const summonerName = document.getElementById('summoner-name');
      
      if (loginScreen && appScreen) {
        loginScreen.style.display = 'none';
        appScreen.style.display = 'flex';
      }
      
      // Update UI
      if (summonerName) {
        summonerName.textContent = result.user.riotId;
      }
    }
  } catch (error) {
    console.error('Error loading user:', error);
  }
});