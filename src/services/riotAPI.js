const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

class RiotAPI {
  constructor() {
    this.apiKey = process.env.RIOT_API_KEY;
    this.region = process.env.RIOT_REGION || 'na1';
    this.americasRegion = process.env.RIOT_AMERICAS_REGION || 'americas';
    
    // API URLs
    this.regionalUrl = `https://${this.region}.api.riotgames.com`;
    this.americasUrl = `https://${this.americasRegion}.api.riotgames.com`;
    
    if (!this.apiKey) {
      console.warn('⚠️  Riot API key not configured in .env file');
    }
  }

  // Get account by Riot ID (gameName#tagLine)
  async getAccountByRiotId(gameName, tagLine) {
    try {
      const response = await axios.get(
        `${this.americasUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        {
          headers: {
            'X-Riot-Token': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching account:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get summoner by PUUID
  async getSummonerByPuuid(puuid) {
    try {
      const response = await axios.get(
        `${this.regionalUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
        {
          headers: {
            'X-Riot-Token': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching summoner:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get current game by PUUID
  async getCurrentGame(puuid) {
    try {
      const response = await axios.get(
        `${this.regionalUrl}/lol/spectator/v5/active-games/by-summoner/${puuid}`,
        {
          headers: {
            'X-Riot-Token': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Not in game - this is expected
        return null;
      }
      console.error('Error fetching current game:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get match history
  async getMatchHistory(puuid, start = 0, count = 20) {
    try {
      const response = await axios.get(
        `${this.americasUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
        {
          params: { start, count },
          headers: {
            'X-Riot-Token': this.apiKey
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
      const response = await axios.get(
        `${this.americasUrl}/lol/match/v5/matches/${matchId}`,
        {
          headers: {
            'X-Riot-Token': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching match:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get champion mastery
  async getChampionMastery(puuid) {
    try {
      const response = await axios.get(
        `${this.regionalUrl}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`,
        {
          headers: {
            'X-Riot-Token': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching champion mastery:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get league entries (ranked info)
  async getLeagueEntries(summonerId) {
    try {
      const response = await axios.get(
        `${this.regionalUrl}/lol/league/v4/entries/by-summoner/${summonerId}`,
        {
          headers: {
            'X-Riot-Token': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching league entries:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = RiotAPI;