import { Router, Request, Response } from 'express';
import ServiceManager from '../services/serviceManager';

const router = Router();

// Get AI providers information and health status
router.get('/providers', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 [AI-PROVIDERS] Checking AI providers status...');
    
    const serviceManager = ServiceManager.getInstance();
    const providersInfo = await serviceManager.getProvidersInfo();
    
    console.log('📊 [AI-PROVIDERS] Providers info retrieved successfully');
    
    res.json({
      success: true,
      data: providersInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [AI-PROVIDERS] Error checking providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check AI provider status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test specific AI provider
router.post('/test/:provider', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;
    const { testText = 'This is a test transcript for AI question generation.' } = req.body;
    
    if (!['gemini', 'ollama'].includes(provider)) {
      res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "gemini" or "ollama"'
      });
      return;
    }

    console.log(`🧪 [AI-PROVIDERS] Testing ${provider.toUpperCase()} with sample text...`);
    
    const serviceManager = ServiceManager.getInstance();
    
    const testConfig = {
      numQuestions: 2,
      types: ['MCQ', 'TRUE_FALSE'],
      difficulty: ['EASY'],
      contextLimit: 1000,
      includeExplanations: true
    };
    
    const startTime = Date.now();
    const result = await serviceManager.generateQuestionsWithProvider(
      testText,
      provider as 'gemini' | 'ollama',
      testConfig,
      'test-session'
    );
    const endTime = Date.now();
    
    console.log(`✅ [AI-PROVIDERS] ${provider.toUpperCase()} test completed successfully`);
    
    res.json({
      success: true,
      data: {
        provider: provider,
        responseTime: endTime - startTime,
        questionsGenerated: result.response?.questions?.length || 0,
        testSuccessful: true,
        sampleQuestions: result.response?.questions?.slice(0, 1) || [] // Return first question as sample
      },
      message: `${provider.toUpperCase()} test completed successfully`
    });
    
  } catch (error) {
    console.error(`❌ [AI-PROVIDERS] ${req.params.provider?.toUpperCase()} test failed:`, error);
    res.status(500).json({
      success: false,
      data: {
        provider: req.params.provider,
        testSuccessful: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      message: `${req.params.provider?.toUpperCase()} test failed`
    });
  }
});

// Switch default AI provider
router.post('/switch/:provider', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;
    
    if (!['gemini', 'ollama'].includes(provider)) {
      res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "gemini" or "ollama"'
      });
      return;
    }

    console.log(`🔄 [AI-PROVIDERS] Switching default provider to ${provider.toUpperCase()}`);
    
    const serviceManager = ServiceManager.getInstance();
    serviceManager.setProvider(provider as 'gemini' | 'ollama');
    
    res.json({
      success: true,
      data: {
        previousProvider: serviceManager.getCurrentProvider(),
        newProvider: provider
      },
      message: `Default AI provider switched to ${provider.toUpperCase()}`
    });
    
  } catch (error) {
    console.error('❌ [AI-PROVIDERS] Error switching provider:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to switch AI provider',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;