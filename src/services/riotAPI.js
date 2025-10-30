const axios = require('axios');

class RiotAPI {
  constructor(region = 'na1') {
    this.region = region; // na1 for NA
    this.platformUrl = `https://${region}.api.riotgames.com`;
    this.americasUrl = 'https://americas.api.riotgames.com'; // For account and match APIs
    
    // Get your API key from https://developer.riotgames.com/
    // For production, store this in environment variables!
    this.apiKey = process.env.RIOT_API_KEY || 'YOUR_RIOT_API_KEY_HERE';
    
    this.axiosInstance = axios.create({
      headers: {
        'X-Riot-Token': this.apiKey
      }
    });
  }

  // Get account info by PUUID (uses americas routing for NA)
  async getAccountByPuuid(puuid) {
    try {
      const response = await this.axiosInstance.get(
        `${this.americasUrl}/riot/account/v1/accounts/by-puuid/${puuid}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching account:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get account by Riot ID (gameName#tagLine)
  async getAccountByRiotId(gameName, tagLine) {
    try {
      const response = await this.axiosInstance.get(
        `${this.americasUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching account by Riot ID:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get summoner info by PUUID
  async getSummonerByPuuid(puuid) {
    try {
      const response = await this.axiosInstance.get(
        `${this.platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching summoner:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get active game by summoner PUUID
  async getActiveGame(puuid) {
    try {
      const response = await this.axiosInstance.get(
        `${this.platformUrl}/lol/spectator/v5/active-games/by-summoner/${puuid}`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Not in game
        return null;
      }
      console.error('Error fetching active game:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get match history
  async getMatchHistory(puuid, count = 20) {
    try {
      const response = await this.axiosInstance.get(
        `${this.americasUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
        {
          params: {
            start: 0,
            count: count
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching match history:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get match details
  async getMatch(matchId) {
    try {
      const response = await this.axiosInstance.get(
        `${this.americasUrl}/lol/match/v5/matches/${matchId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching match:', error.response?.data || error.message);
      throw error;
    }
  }

  // Validate API key
  async validateApiKey() {
    try {
      // Make a simple request to check if API key works
      await this.axiosInstance.get(`${this.platformUrl}/lol/status/v4/platform-data`);
      return true;
    } catch (error) {
      if (error.response?.status === 403) {
        console.error('Invalid API key');
        return false;
      }
      console.error('Error validating API key:', error.message);
      return false;
    }
  }
}

module.exports = RiotAPI;
