// Mobile Web Speech API Recognition Handler
// This provides fallback speech recognition for mobile devices using the browser's built-in API

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export class MobileSpeechRecognition {
  private recognition: ISpeechRecognition | null = null;
  private isListening = false;
  private onTranscriptCallback: ((result: TranscriptResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;
  private sessionId: string;
  private lastTranscriptTime = 0;
  
  constructor(sessionId: string) {
    this.sessionId = sessionId;
    console.log('🎤 [MOBILE SPEECH] Initializing Web Speech API for session:', sessionId);
  }

  public isSupported(): boolean {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    console.log('🎤 [MOBILE SPEECH] Web Speech API supported:', supported);
    return supported;
  }

  public initialize(): boolean {
    if (!this.isSupported()) {
      console.error('❌ [MOBILE SPEECH] Web Speech API not supported in this browser');
      return false;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configure recognition
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      // Set up event handlers
      this.recognition.onstart = () => {
        console.log('✅ [MOBILE SPEECH] Recognition started');
        this.isListening = true;
        this.onStatusCallback?.('recording');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const resultIndex = event.resultIndex;

        for (let i = resultIndex; i < results.length; i++) {
          const result = results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          const isFinal = result.isFinal;

          console.log(`📝 [MOBILE SPEECH] ${isFinal ? 'Final' : 'Interim'} transcript:`, transcript);

          this.lastTranscriptTime = Date.now();

          this.onTranscriptCallback?.({
            text: transcript,
            isFinal: isFinal,
            confidence: confidence,
            timestamp: Date.now(),
          });
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ [MOBILE SPEECH] Recognition error:', event.error, event.message);
        
        // Handle specific error types
        if (event.error === 'no-speech') {
          console.log('⚠️ [MOBILE SPEECH] No speech detected, continuing...');
          // Don't stop on no-speech, just continue
          return;
        }
        
        if (event.error === 'audio-capture') {
          this.onErrorCallback?.('Microphone access denied or not available');
          this.stop();
          return;
        }
        
        if (event.error === 'not-allowed') {
          this.onErrorCallback?.('Microphone permission denied');
          this.stop();
          return;
        }

        this.onErrorCallback?.(event.error);
      };

      this.recognition.onend = () => {
        console.log('🔄 [MOBILE SPEECH] Recognition ended');
        
        // Auto-restart if we're supposed to be listening
        if (this.isListening) {
          console.log('🔄 [MOBILE SPEECH] Auto-restarting recognition...');
          this.restartTimeout = setTimeout(() => {
            try {
              this.recognition?.start();
            } catch (error) {
              console.error('❌ [MOBILE SPEECH] Failed to restart:', error);
            }
          }, 100);
        }
      };

      console.log('✅ [MOBILE SPEECH] Recognition initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [MOBILE SPEECH] Failed to initialize:', error);
      return false;
    }
  }

  public async start(): Promise<boolean> {
    if (!this.recognition) {
      console.error('❌ [MOBILE SPEECH] Recognition not initialized');
      return false;
    }

    if (this.isListening) {
      console.log('⚠️ [MOBILE SPEECH] Already listening');
      return true;
    }

    try {
      console.log('▶️ [MOBILE SPEECH] Starting recognition...');
      this.isListening = true;
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('❌ [MOBILE SPEECH] Failed to start:', error);
      this.isListening = false;
      return false;
    }
  }

  public stop(): void {
    console.log('⏹️ [MOBILE SPEECH] Stopping recognition...');
    
    this.isListening = false;
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    try {
      this.recognition?.stop();
    } catch (error) {
      console.error('❌ [MOBILE SPEECH] Error stopping recognition:', error);
    }

    this.onStatusCallback?.('stopped');
  }

  public onTranscript(callback: (result: TranscriptResult) => void): void {
    this.onTranscriptCallback = callback;
  }

  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  public onStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  public cleanup(): void {
    console.log('🧹 [MOBILE SPEECH] Cleaning up...');
    this.stop();
    this.recognition = null;
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
  }

  public getStatus(): { isListening: boolean; lastTranscriptTime: number } {
    return {
      isListening: this.isListening,
      lastTranscriptTime: this.lastTranscriptTime,
    };
  }
}
