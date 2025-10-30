const { EventEmitter } = require('events');
const io = require('socket.io-client');

class VoiceManager extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.currentChannel = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.agoraClient = null;
    this.localAudioTrack = null;
    
    // Connect to backend server
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.connectToBackend();
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

      // Initialize Agora
      // Note: You'll need to require agora-electron-sdk properly
      // This is a simplified version - full Agora integration is more complex
      
      if (!this.agoraClient) {
        // const AgoraRtcEngine = require('agora-electron-sdk').default;
        // this.agoraClient = new AgoraRtcEngine();
        // this.agoraClient.initialize(channelInfo.agoraAppId);
        
        console.log('Would initialize Agora here with:', channelInfo);
      }

      // Join the Agora channel
      // await this.agoraClient.joinChannel(
      //   channelInfo.agoraToken,
      //   channelInfo.channelName,
      //   channelInfo.uid
      // );

      // Enable audio
      // this.localAudioTrack = await this.agoraClient.createMicrophoneAudioTrack();
      // await this.localAudioTrack.setEnabled(true);

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
      // if (this.agoraClient) {
      //   await this.agoraClient.leaveChannel();
      // }

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

    if (this.localAudioTrack) {
      // this.localAudioTrack.setEnabled(!this.isMuted);
    }

    console.log(`Audio ${this.isMuted ? 'muted' : 'unmuted'}`);
    this.emit('mute-changed', this.isMuted);
    
    return this.isMuted;
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;

    if (this.isDeafened) {
      this.isMuted = true;
      // Mute local audio and stop receiving remote audio
      // this.agoraClient.muteAllRemoteAudioStreams(true);
    } else {
      // this.agoraClient.muteAllRemoteAudioStreams(false);
    }

    console.log(`Audio ${this.isDeafened ? 'deafened' : 'undeafened'}`);
    this.emit('deafen-changed', this.isDeafened);
    
    return this.isDeafened;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }

    if (this.agoraClient) {
      // this.agoraClient.release();
      this.agoraClient = null;
    }
  }
}

module.exports = VoiceManager;
