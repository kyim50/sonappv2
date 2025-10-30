// Get references to UI elements
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const clientIndicator = document.getElementById('clientIndicator');
const clientStatus = document.getElementById('clientStatus');
const gameStatus = document.getElementById('gameStatus');
const summonerName = document.getElementById('summonerName');
const voiceActive = document.getElementById('voiceActive');
const channelInfo = document.getElementById('channelInfo');
const teammatesList = document.getElementById('teammatesList');
const teammates = document.getElementById('teammates');
const muteBtn = document.getElementById('muteBtn');
const deafenBtn = document.getElementById('deafenBtn');
const leaveBtn = document.getElementById('leaveBtn');

// State
let isLoggedIn = false;
let isMuted = false;
let isDeafened = false;
let currentUser = null;

// Initialize
async function init() {
  // Check if user is already logged in
  currentUser = await window.electronAPI.getUser();
  if (currentUser && currentUser.puuid) {
    showAppScreen();
  }

  // Set up event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Listen for game state changes
  window.electronAPI.onGameState((data) => {
    if (data.inGame) {
      gameStatus.textContent = 'In Game';
      gameStatus.style.color = '#00ff88';
    } else {
      gameStatus.textContent = 'Not in Game';
      gameStatus.style.color = '#fff';
      voiceActive.classList.add('hidden');
      muteBtn.disabled = true;
      deafenBtn.disabled = true;
      leaveBtn.disabled = true;
    }
  });

  // Listen for client status
  window.electronAPI.onClientStatus((data) => {
    if (data.running) {
      clientStatus.textContent = 'Running';
      clientIndicator.classList.add('active');
      clientIndicator.classList.remove('inactive');
    } else {
      clientStatus.textContent = 'Not Running';
      clientIndicator.classList.remove('active');
      clientIndicator.classList.add('inactive');
    }
  });

  // Listen for voice channel join
  window.electronAPI.onVoiceJoined((data) => {
    console.log('Joined voice channel:', data);
    voiceActive.classList.remove('hidden');
    channelInfo.textContent = `${data.connectedTeammates || 0} teammate(s) connected`;
    
    muteBtn.disabled = false;
    deafenBtn.disabled = false;
    leaveBtn.disabled = false;

    // Show teammates if any
    if (data.connectedTeammates > 0) {
      teammatesList.classList.remove('hidden');
      // In a real implementation, you'd show actual teammate names here
    }
  });

  // Listen for errors
  window.electronAPI.onError((data) => {
    alert('Error: ' + data.message);
  });
}

async function handleLogin() {
  const gameName = document.getElementById('gameName').value.trim();
  const tagLine = document.getElementById('tagLine').value.trim();

  if (!gameName || !tagLine) {
    alert('Please enter both Game Name and Tag Line');
    return;
  }

  try {
    const riotId = `${gameName}#${tagLine}`;
    
    // Call the login IPC with gameName and tagLine
    const result = await window.electronAPI.login({
      gameName: gameName,
      tagLine: tagLine,
      riotId: riotId
    });

    if (result.success) {
      currentUser = result.user;
      showAppScreen();
    } else {
      alert('Login failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Login error: ' + error.message);
  }
}

function showAppScreen() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  
  if (currentUser) {
    summonerName.textContent = currentUser.riotId || currentUser.summonerName || 'Unknown';
  }
  
  isLoggedIn = true;
}

async function toggleMute() {
  try {
    isMuted = await window.electronAPI.toggleMute();
    
    if (isMuted) {
      muteBtn.textContent = '🔴 Unmute';
      muteBtn.style.background = '#ff4444';
    } else {
      muteBtn.textContent = '🎤 Mute';
      muteBtn.style.background = '';
    }
  } catch (error) {
    console.error('Error toggling mute:', error);
  }
}

async function toggleDeafen() {
  try {
    isDeafened = await window.electronAPI.toggleDeafen();
    
    if (isDeafened) {
      deafenBtn.textContent = '🔴 Undeafen';
      deafenBtn.style.background = '#ff4444';
      // Also update mute button since deafen implies mute
      muteBtn.textContent = '🔴 Unmute';
      muteBtn.style.background = '#ff4444';
      isMuted = true;
    } else {
      deafenBtn.textContent = '🔇 Deafen';
      deafenBtn.style.background = '';
    }
  } catch (error) {
    console.error('Error toggling deafen:', error);
  }
}

async function leaveVoice() {
  try {
    await window.electronAPI.leaveVoice();
    
    voiceActive.classList.add('hidden');
    teammatesList.classList.add('hidden');
    muteBtn.disabled = true;
    deafenBtn.disabled = true;
    leaveBtn.disabled = true;
    
    // Reset button states
    isMuted = false;
    isDeafened = false;
    muteBtn.textContent = '🎤 Mute';
    muteBtn.style.background = '';
    deafenBtn.textContent = '🔇 Deafen';
    deafenBtn.style.background = '';
  } catch (error) {
    console.error('Error leaving voice:', error);
  }
}

// Initialize when DOM is ready
init();