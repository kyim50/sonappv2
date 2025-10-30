const { EventEmitter } = require('events');
const io = require('socket.io-client');

class VoiceManager extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.currentChannel = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.rtcEngine = null;
    this.localAudioTrack = null;
    this.agoraAppId = null;
    this.isConnected = false;
    
    // Connect to backend server
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.connectToBackend();
    
    // Try to load Agora SDK
    try {
      const AgoraRtcEngine = require('agora-electron-sdk').default;
      this.AgoraRtcEngine = AgoraRtcEngine;
      console.log('✅ Agora SDK loaded successfully');
    } catch (error) {
      console.log('⚠️  Agora SDK not installed. Voice will not work.');
      console.log('   Install with: npm install agora-electron-sdk');
      this.AgoraRtcEngine = null;
    }
  }

  connectToBackend() {
    this.socket = io(this.backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
      console.log('Connected to backend server');
      this.emit('backend-connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from backend server');
      this.emit('backend-disconnected');
    });

    this.socket.on('channel-created', (data) => {
      console.log('Channel created:', data);
      this.emit('channel-ready', data);
    });

    this.socket.on('user-joined-channel', (data) => {
      console.log('User joined channel:', data);
      this.emit('user-joined', data);
    });

    this.socket.on('user-left-channel', (data) => {
      console.log('User left channel:', data);
      this.emit('user-left', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  initializeAgora(agoraAppId) {
    if (!this.AgoraRtcEngine) {
      console.log('⚠️  Cannot initialize - Agora SDK not available');
      return false;
    }

    if (this.rtcEngine) {
      console.log('Agora already initialized');
      return true;
    }

    try {
      this.agoraAppId = agoraAppId;
      
      // Create RTC Engine instance
      this.rtcEngine = new this.AgoraRtcEngine();
      
      // Initialize with proper context
      const initResult = this.rtcEngine.initialize(agoraAppId, {
        // Area code for region
        areaCode: [1], // 1 = Global (excluding China)
        
        // Log configuration
        logConfig: {
          filePath: '',
          fileSize: 2048,
          level: 1
        }
      });

      if (initResult < 0) {
        console.error('❌ Agora initialization failed with code:', initResult);
        return false;
      }
      
      // Set channel profile to communication (voice chat)
      this.rtcEngine.setChannelProfile(1); // 1 = COMMUNICATION
      
      // Enable audio
      this.rtcEngine.enableAudio();
      
      // Set audio profile for voice chat
      // Profile 4 = MUSIC_STANDARD (good quality voice)
      // Scenario 3 = GAME_STREAMING
      this.rtcEngine.setAudioProfile(4, 3);
      
      // Register event handlers
      this.setupAgoraEventHandlers();
      
      console.log('✅ Agora RTC Engine initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Agora:', error);
      return false;
    }
  }

  setupAgoraEventHandlers() {
    if (!this.rtcEngine) return;

    // User joined channel
    this.rtcEngine.on('userJoined', (uid, elapsed) => {
      console.log(`🎤 User joined voice: ${uid}`);
      this.emit('agora-user-joined', uid);
    });

    // User left channel
    this.rtcEngine.on('userOffline', (uid, reason) => {
      console.log(`🔇 User left voice: ${uid}`);
      this.emit('agora-user-left', uid);
    });

    // Local user joined successfully
    this.rtcEngine.on('joinChannelSuccess', (channel, uid, elapsed) => {
      console.log(`✅ Joined Agora channel: ${channel} as uid: ${uid}`);
      this.isConnected = true;
      this.emit('voice-connected', { channel, uid });
    });

    // Connection lost
    this.rtcEngine.on('connectionLost', () => {
      console.log('⚠️  Voice connection lost');
      this.isConnected = false;
      this.emit('voice-connection-lost');
    });

    // Error occurred
    this.rtcEngine.on('error', (err, msg) => {
      console.error('❌ Agora error:', err, msg);
      this.emit('agora-error', { err, msg });
    });

    // Audio volume indication
    this.rtcEngine.on('audioVolumeIndication', (speakers, speakerNumber, totalVolume) => {
      this.emit('audio-volume', { speakers, speakerNumber, totalVolume });
    });
  }

  async findOrCreateChannel(gameInfo) {
    return new Promise((resolve, reject) => {
      // Request backend to find or create a voice channel
      this.socket.emit('find-or-create-channel', gameInfo, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  async joinChannel(channelInfo) {
    try {
      this.currentChannel = channelInfo;

      // Initialize Agora if not already done
      if (!this.rtcEngine && this.AgoraRtcEngine) {
        const initialized = this.initializeAgora(channelInfo.agoraAppId);
        if (!initialized) {
          console.log('⚠️  Failed to initialize Agora - voice will not work');
          
          // Notify backend anyway (for tracking)
          this.socket.emit('join-channel', {
            channelId: channelInfo.channelId,
            userPuuid: channelInfo.userPuuid
          });
          
          this.emit('joined-channel-no-voice', channelInfo);
          return false;
        }
      }

      if (!this.rtcEngine) {
        console.log('⚠️  Agora SDK not available - voice will not work');
        console.log('   Install with: npm install agora-electron-sdk');
        
        // Notify backend anyway (for tracking)
        this.socket.emit('join-channel', {
          channelId: channelInfo.channelId,
          userPuuid: channelInfo.userPuuid
        });
        
        this.emit('joined-channel-no-voice', channelInfo);
        return false;
      }

      // Join the Agora channel
      console.log(`🎤 Joining Agora channel: ${channelInfo.channelName}`);
      
      const result = this.rtcEngine.joinChannel(
        channelInfo.agoraToken,  // Token (null for "App ID only" mode)
        channelInfo.channelName, // Channel name
        '',                      // Additional info (optional)
        0                        // UID (0 = auto-assign)
      );

      if (result === 0) {
        console.log('✅ Voice join initiated successfully');
      } else {
        console.error('❌ Failed to join voice channel, error code:', result);
      }

      // Notify backend that we joined
      this.socket.emit('join-channel', {
        channelId: channelInfo.channelId,
        userPuuid: channelInfo.userPuuid
      });

      console.log('Joined voice channel:', channelInfo.channelName);
      this.emit('joined-channel', channelInfo);

      return true;
    } catch (error) {
      console.error('Error joining channel:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async leaveChannel() {
    if (!this.currentChannel) {
      return;
    }

    try {
      // Leave Agora channel
      if (this.rtcEngine) {
        this.rtcEngine.leaveChannel();
        this.isConnected = false;
        console.log('✅ Left Agora channel');
      }

      // Notify backend
      this.socket.emit('leave-channel', {
        channelId: this.currentChannel.channelId
      });

      console.log('Left voice channel');
      this.emit('left-channel');
      
      this.currentChannel = null;
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.rtcEngine) {
      this.rtcEngine.muteLocalAudioStream(this.isMuted);
      console.log(`🎤 Microphone ${this.isMuted ? 'muted' : 'unmuted'}`);
    } else {
      console.log(`Microphone ${this.isMuted ? 'muted' : 'unmuted'} (no SDK)`);
    }

    this.emit('mute-changed', this.isMuted);
    return this.isMuted;
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;

    if (this.rtcEngine) {
      // When deafened, mute local microphone
      if (this.isDeafened) {
        this.isMuted = true;
        this.rtcEngine.muteLocalAudioStream(true);
      }
      
      // Mute all remote audio
      this.rtcEngine.muteAllRemoteAudioStreams(this.isDeafened);
      console.log(`🔇 Audio ${this.isDeafened ? 'deafened' : 'undeafened'}`);
    } else {
      if (this.isDeafened) {
        this.isMuted = true;
      }
      console.log(`Audio ${this.isDeafened ? 'deafened' : 'undeafened'} (no SDK)`);
    }

    this.emit('deafen-changed', this.isDeafened);
    if (this.isDeafened) {
      this.emit('mute-changed', this.isMuted);
    }
    
    return this.isDeafened;
  }

  setVolume(volume) {
    if (!this.rtcEngine) {
      console.log('⚠️  RTC Engine not initialized');
      return;
    }

    try {
      // Volume range: 0-100
      const normalizedVolume = Math.max(0, Math.min(100, volume));
      this.rtcEngine.adjustPlaybackSignalVolume(normalizedVolume);
      console.log(`🔊 Volume set to ${normalizedVolume}`);
      this.emit('volume-changed', normalizedVolume);
    } catch (error) {
      console.error('❌ Error setting volume:', error);
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      currentChannel: this.currentChannel,
      sdkAvailable: this.rtcEngine !== null,
      backendConnected: this.socket?.connected || false
    };
  }

  disconnect() {
    // Leave voice channel
    if (this.currentChannel) {
      this.leaveChannel();
    }

    // Disconnect from backend
    if (this.socket) {
      this.socket.disconnect();
    }

    // Cleanup Agora
    if (this.rtcEngine) {
      try {
        this.rtcEngine.release();
        this.rtcEngine = null;
        console.log('✅ Agora RTC Engine cleaned up');
      } catch (error) {
        console.error('❌ Error during Agora cleanup:', error);
      }
    }
  }
}

module.exports = VoiceManager;