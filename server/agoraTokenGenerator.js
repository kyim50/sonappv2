const crypto = require('crypto');

/**
 * Agora Token Generator
 * Generates RTC tokens for voice channels using Agora credentials
 */
class AgoraTokenGenerator {
  constructor(appId, appCertificate) {
    this.appId = appId;
    this.appCertificate = appCertificate;
  }

  /**
   * Generate a simple token for testing
   * In production, use the agora-access-token package for proper token generation
   * 
   * @param {string} channelName - The channel name
   * @param {string} uid - User ID (can be 0 for auto-assign)
   * @param {number} expirationTimeInSeconds - Token expiration (default: 24 hours)
   * @returns {string|null} - Token or null for App ID only mode
   */
  generateToken(channelName, uid = '0', expirationTimeInSeconds = 86400) {
    // For development/testing, you can use null to enable "App ID only" mode
    // Make sure "App ID only" is enabled in Agora console for testing
    
    // To use proper tokens, install: npm install agora-access-token
    // Then uncomment the code below:
    
    /*
    const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );
    
    return token;
    */
    
    // For now, return null to use App ID only mode
    // This works if you enable it in Agora console
    console.log('⚠️  Using App ID only mode (no token)');
    console.log('   Make sure "App ID only" is enabled in Agora console');
    console.log('   For production, implement proper token generation above');
    
    return null;
  }

  /**
   * Generate token using REST API (alternative method)
   * This uses Agora's RESTful API to generate tokens
   */
  async generateTokenViaAPI(channelName, uid = '0') {
    // This would use the REST API credentials
    // For now, using the simpler approach above
    return this.generateToken(channelName, uid);
  }
}

module.exports = AgoraTokenGenerator;
