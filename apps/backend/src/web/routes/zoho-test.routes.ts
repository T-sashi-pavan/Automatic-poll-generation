// File: apps/backend/src/web/routes/zoho-test.routes.ts
import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Test route to manually test Zoho OAuth token exchange
router.get('/test-zoho-token', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    console.log('🔍 Testing Zoho token exchange with code:', code.substring(0, 20) + '...');

    // Manual token exchange using axios
    const tokenData = {
      grant_type: 'authorization_code',
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: 'http://localhost:8000/oauth/callback',
      code: code
    };

    console.log('📤 Token request data:', {
      grant_type: tokenData.grant_type,
      client_id: tokenData.client_id.substring(0, 10) + '...',
      redirect_uri: tokenData.redirect_uri,
      code: tokenData.code.substring(0, 20) + '...'
    });

    const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    console.log('✅ Token response received:', {
      status: tokenResponse.status,
      data: tokenResponse.data
    });

    // Test user info retrieval
    const accessToken = tokenResponse.data.access_token;
    const userInfoResponse = await axios.get('https://accounts.zoho.com/oauth/user/info', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    console.log('👤 User info response:', userInfoResponse.data);

    res.json({
      success: true,
      token: tokenResponse.data,
      userInfo: userInfoResponse.data,
      state: state
    });

  } catch (error: any) {
    console.error('❌ Zoho test error:', error.message);
    if (error.response) {
      console.error('❌ Error response data:', error.response.data);
      console.error('❌ Error response status:', error.response.status);
    }
    res.status(500).json({ 
      error: error.message,
      response: error.response?.data 
    });
  }
});

export default router;