import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IOllamaQuestion extends Document {
  _id: ObjectId;
  id: string;
  type: 'MCQ' | 'TRUE_FALSE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  
  // Ollama-specific fields
  isOllamaBased: boolean;
  ollamaModel: string;
  sourceTranscriptId: ObjectId;
  
  // Session/Room tracking
  sessionId: string;
  roomId: string;
  hostId: ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getFormattedData(): any;
}

const OllamaQuestionSchema = new Schema<IOllamaQuestion>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  type: {
    type: String,
    enum: ['MCQ', 'TRUE_FALSE'],
    required: true
  },
  
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'MEDIUM'
  },
  
  question: {
    type: String,
    required: true,
    maxlength: 1000  // Increased from 500
  },
  
  options: [{
    type: String,
    maxlength: 500  // Increased from 200
  }],
  
  correctAnswer: {
    type: String,
    required: true
  },
  
  explanation: {
    type: String,
    maxlength: 2000  // Increased from 1000
  },
  
  // Ollama-specific
  isOllamaBased: {
    type: Boolean,
    default: true,
    required: true
  },
  
  ollamaModel: {
    type: String,
    default: 'llama3.2:latest',
    required: true
  },
  
  sourceTranscriptId: {
    type: Schema.Types.ObjectId,
    ref: 'WholeTimerTranscript',
    required: true,
    index: true
  },
  
  // Session/Room tracking
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  roomId: {
    type: String,
    required: true,
    index: true
  },
  
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
  
}, {
  timestamps: true
});

// Compound indexes for efficient queries
OllamaQuestionSchema.index({ roomId: 1, createdAt: -1 });
OllamaQuestionSchema.index({ sessionId: 1, createdAt: -1 });
OllamaQuestionSchema.index({ sourceTranscriptId: 1 });
OllamaQuestionSchema.index({ hostId: 1, createdAt: -1 });

// Instance method to format data for API responses
OllamaQuestionSchema.methods.getFormattedData = function() {
  return {
    id: this.id,
    type: this.type.toLowerCase(),
    difficulty: this.difficulty.toLowerCase(),
    questionText: this.question,
    options: this.options || [],
    correctAnswer: this.correctAnswer,
    correctIndex: this.options ? this.options.indexOf(this.correctAnswer) : -1,
    explanation: this.explanation,
    points: 1,
    source: 'ollama-transcript',
    isOllamaBased: true,
    ollamaModel: this.ollamaModel,
    createdAt: this.createdAt
  };
};

const OllamaQuestion = mongoose.model<IOllamaQuestion>('OllamaQuestion', OllamaQuestionSchema);

export default OllamaQuestion;