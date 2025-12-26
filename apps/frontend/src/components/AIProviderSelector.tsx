import React, { useState, useEffect } from 'react';
import { Bot, Cpu, CheckCircle, XCircle, Loader2, TestTube } from 'lucide-react';
import { apiService } from '../utils/api';
import toast from 'react-hot-toast';

interface AIProvider {
  name: string;
  available: boolean;
  requiresApiKey: boolean;
  description: string;
  models?: any[];
}

interface AIProvidersInfo {
  current: 'gemini' | 'ollama';
  providers: {
    gemini: AIProvider;
    ollama: AIProvider;
  };
}

interface AIProviderSelectorProps {
  selectedProvider: 'gemini' | 'ollama';
  onProviderChange: (provider: 'gemini' | 'ollama') => void;
  disabled?: boolean;
  showStatus?: boolean;
  showTestButton?: boolean;
  className?: string;
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  disabled = false,
  showStatus = true,
  showTestButton = false,
  className = ''
}) => {
  const [providersInfo, setProvidersInfo] = useState<AIProvidersInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchProvidersInfo();
  }, []);

  const fetchProvidersInfo = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAIProviders();
      setProvidersInfo(response.data.data);
    } catch (error) {
      console.error('Failed to fetch AI providers info:', error);
      toast.error('Failed to load AI provider status');
    } finally {
      setLoading(false);
    }
  };

  const testProvider = async (provider: 'gemini' | 'ollama') => {
    try {
      setTesting(provider);
      const testToast = toast.loading(`Testing ${provider.toUpperCase()}...`);
      
      const response = await apiService.testAIProvider(provider);
      
      if (response.data.success) {
        toast.success(
          `✅ ${provider.toUpperCase()} test successful! Generated ${response.data.data.questionsGenerated} questions in ${response.data.data.responseTime}ms`,
          { id: testToast, duration: 4000 }
        );
      } else {
        throw new Error(response.data.message || 'Test failed');
      }
    } catch (error: any) {
      toast.error(
        `❌ ${provider.toUpperCase()} test failed: ${error.response?.data?.message || error.message}`,
        { duration: 6000 }
      );
    } finally {
      setTesting(null);
    }
  };

  const getProviderIcon = (provider: 'gemini' | 'ollama') => {
    return provider === 'gemini' ? Bot : Cpu;
  };

  const getStatusIcon = (available: boolean) => {
    return available ? CheckCircle : XCircle;
  };

  const getProviderLabel = (provider: 'gemini' | 'ollama', info?: AIProvider) => {
    if (provider === 'gemini') {
      return '🤖 Gemini AI';
    } else {
      return info?.models && info.models.length > 0 
        ? `🦙 Ollama (${info.models.length} models)`
        : '🦙 Ollama (Local)';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-400">Loading AI providers...</span>
      </div>
    );
  }

  if (!providersInfo) {
    return (
      <div className={`text-sm text-red-400 ${className}`}>
        Failed to load AI providers
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-gray-300 mb-2">
        AI Provider Selection
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(Object.keys(providersInfo.providers) as Array<'gemini' | 'ollama'>).map((provider) => {
          const info = providersInfo.providers[provider];
          const Icon = getProviderIcon(provider);
          const StatusIcon = getStatusIcon(info.available);
          const isSelected = selectedProvider === provider;
          
          return (
            <div
              key={provider}
              className={`relative border rounded-lg p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onProviderChange(provider)}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                </div>
              )}
              
              {/* Provider header */}
              <div className="flex items-center space-x-3 mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <h3 className={`font-medium ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
                    {getProviderLabel(provider, info)}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {info.description}
                  </p>
                </div>
              </div>
              
              {/* Status and details */}
              {showStatus && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                  <div className="flex items-center space-x-2">
                    <StatusIcon 
                      className={`w-4 h-4 ${info.available ? 'text-green-500' : 'text-red-500'}`} 
                    />
                    <span className={`text-xs ${info.available ? 'text-green-400' : 'text-red-400'}`}>
                      {info.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  {showTestButton && info.available && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testProvider(provider);
                      }}
                      disabled={testing === provider}
                      className="flex items-center space-x-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-2 py-1 rounded transition-colors"
                    >
                      {testing === provider ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <TestTube className="w-3 h-3" />
                      )}
                      <span>Test</span>
                    </button>
                  )}
                </div>
              )}
              
              {/* Additional info for Ollama */}
              {provider === 'ollama' && info.models && info.models.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">Available models:</p>
                  <div className="flex flex-wrap gap-1">
                    {info.models.slice(0, 2).map((model: any, index: number) => (
                      <span 
                        key={index}
                        className="text-xs bg-gray-700 px-2 py-1 rounded"
                      >
                        {model.name}
                      </span>
                    ))}
                    {info.models.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{info.models.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* API Key requirement */}
              {info.requiresApiKey && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-xs text-yellow-400">
                    🔑 Requires API key
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Current provider indicator */}
      <div className="text-xs text-gray-400 text-center">
        Current default: <span className="text-blue-400 font-medium">
          {providersInfo.current.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

export default AIProviderSelector;