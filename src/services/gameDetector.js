const { EventEmitter } = require('events');
const https = require('https');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class GameDetector extends EventEmitter {
  constructor() {
    super();
    this.isInGame = false;
    this.isClientRunning = false;
    this.checkInterval = null;
    this.lcuCredentials = null;
    
    // LCU API runs on https://127.0.0.1:2999 when in-game
    this.gameApiUrl = 'https://127.0.0.1:2999';
    
    // Create HTTPS agent that ignores self-signed certificates
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  startMonitoring() {
    console.log('Starting League client monitoring...');
    
    // Check every 3 seconds
    this.checkInterval = setInterval(() => {
      this.checkLeagueClient();
      if (this.isClientRunning) {
        this.checkGameState();
      }
    }, 3000);

    // Initial check
    this.checkLeagueClient();
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkLeagueClient() {
    // Check if League client is running
    const command = process.platform === 'win32' 
      ? 'tasklist'
      : 'ps aux';

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error checking processes:', error);
        return;
      }

      // Different process names for different platforms
      const processNames = process.platform === 'darwin' 
        ? [
            'LeagueClient',
            'League of Legends',
            'RiotClientServices'
          ]
        : process.platform === 'win32'
        ? [
            'LeagueClientUx.exe',
            'LeagueClient.exe',
            'League of Legends.exe'
          ]
        : [
            'LeagueClient',
            'LeagueClientUx'
          ];

      const isRunning = processNames.some(name => 
        stdout.toLowerCase().includes(name.toLowerCase())
      );

      if (isRunning !== this.isClientRunning) {
        this.isClientRunning = isRunning;
        this.emit('clientDetected', isRunning);
        console.log(`League client ${isRunning ? 'detected' : 'not running'}`);
      }
    });
  }

  async checkGameState() {
    try {
      const gameData = await this.fetchLiveGameData();
      
      if (gameData && !this.isInGame) {
        // Game just started
        this.isInGame = true;
        this.emit('gameStarted', gameData);
      } else if (!gameData && this.isInGame) {
        // Game just ended
        this.isInGame = false;
        this.emit('gameEnded');
      }
    } catch (error) {
      // Game not active, this is normal
      if (this.isInGame) {
        this.isInGame = false;
        this.emit('gameEnded');
      }
    }
  }

  fetchLiveGameData() {
    return new Promise((resolve, reject) => {
      const url = `${this.gameApiUrl}/liveclientdata/allgamedata`;
      
      https.get(url, { agent: this.httpsAgent }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const gameData = JSON.parse(data);
              resolve(gameData);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error('Game not active'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  // Alternative: Get LCU credentials from lockfile (for client API access)
  async getLCUCredentials() {
    try {
      // League lockfile location
      const lockfilePath = process.platform === 'win32'
        ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'Riot Games', 'League of Legends', 'lockfile')
        : process.platform === 'darwin'
        ? path.join(process.env.HOME, 'Library', 'Application Support', 'Riot Games', 'League of Legends', 'lockfile')
        : path.join(process.env.HOME, '.local', 'share', 'Riot Games', 'League of Legends', 'lockfile');

      if (!fs.existsSync(lockfilePath)) {
        return null;
      }

      const lockfileContent = fs.readFileSync(lockfilePath, 'utf8');
      const [name, pid, port, password, protocol] = lockfileContent.split(':');

      return {
        port,
        password,
        url: `https://127.0.0.1:${port}`
      };
    } catch (error) {
      console.error('Error reading LCU lockfile:', error);
      return null;
    }
  }

  // Call LCU API (for champion select, lobby info, etc.)
  async callLCUApi(endpoint) {
    if (!this.lcuCredentials) {
      this.lcuCredentials = await this.getLCUCredentials();
    }

    if (!this.lcuCredentials) {
      throw new Error('LCU not available');
    }

    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: this.lcuCredentials.port,
        path: endpoint,
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`riot:${this.lcuCredentials.password}`).toString('base64')
        },
        agent: this.httpsAgent
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`LCU API error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = GameDetector;