import React, { useState, useEffect } from 'react';
import AIProviderSelector from '../components/AIProviderSelector';
import { apiService } from '../utils/api';
import toast from 'react-hot-toast';
import { Settings, Save } from 'lucide-react';

const AIProviderSettings: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'ollama'>('ollama');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load saved provider from localStorage
    const saved = localStorage.getItem('selectedAIProvider') as 'gemini' | 'ollama';
    if (saved) {
      setSelectedProvider(saved);
    } else {
      // Default to ollama
      localStorage.setItem('selectedAIProvider', 'ollama');
    }
  }, []);

  const handleProviderChange = (provider: 'gemini' | 'ollama') => {
    setSelectedProvider(provider);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Save to localStorage
      localStorage.setItem('selectedAIProvider', selectedProvider);
      
      // Optionally, update the backend default provider
      await apiService.switchAIProvider(selectedProvider);
      
      toast.success(`✅ AI Provider set to ${selectedProvider.toUpperCase()}! All future questions will use this provider.`, {
        duration: 5000
      });
    } catch (error) {
      console.error('Failed to save AI provider:', error);
      toast.error('Failed to save AI provider settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <Settings className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">
            AI Provider Settings
          </h1>
        </div>

        {/* Description */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-3">
            Choose Your AI Provider
          </h2>
          <p className="text-gray-300 mb-4">
            Select which AI provider to use for generating questions from timer transcripts.
            This setting will be saved and used for all future question generation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
              <h3 className="font-semibold text-blue-300 mb-2">🤖 Gemini AI</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Cloud-based Google AI</li>
                <li>• Advanced language understanding</li>
                <li>• Requires API key</li>
                <li>• May have usage limits</li>
              </ul>
            </div>
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
              <h3 className="font-semibold text-green-300 mb-2">🦙 Ollama (Local)</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Runs on your computer</li>
                <li>• Complete privacy</li>
                <li>• No API key needed</li>
                <li>• Free and unlimited</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Provider Selector */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <AIProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={handleProviderChange}
            showStatus={true}
            showTestButton={true}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Current Selection Info */}
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-gray-300">Current selection:</span>{' '}
            <span className={`font-bold ${selectedProvider === 'ollama' ? 'text-green-400' : 'text-blue-400'}`}>
              {selectedProvider === 'ollama' ? '🦙 Ollama (Local AI)' : '🤖 Gemini AI'}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Ollama is recommended for privacy and unlimited usage. Questions generated
            will show a label indicating which AI was used.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIProviderSettings;