import mongoose, { Schema, Document } from 'mongoose';

export interface IRAGTimerQuestion extends Document {
  roomId: string;
  sessionId: string;
  transcriptId: string;
  hostId: string;
  
  type: 'MCQ' | 'TRUE_FALSE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  
  // RAG specific fields
  ragModel: string; // 'groq-rag'
  groqModel: string; // 'llama-3.1-70b-versatile'
  contextUsed: string[]; // Historical questions used as context
  similarityScore?: number;
  
  // Metadata
  generationTime: number; // in milliseconds
  tokensUsed?: number;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getFormattedData(): any;
}

const RAGTimerQuestionSchema = new Schema<IRAGTimerQuestion>({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  transcriptId: {
    type: String,
    required: true,
    ref: 'WholeTimerTranscript'
  },
  hostId: {
    type: String,
    required: true
  },
  
  type: {
    type: String,
    enum: ['MCQ', 'TRUE_FALSE'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    required: true
  },
  question: {
    type: String,
    required: true,
    maxlength: 1000
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(options: string[]) {
        return options.length >= 2 && options.length <= 4;
      },
      message: 'Options must have 2-4 items'
    }
  },
  correctAnswer: {
    type: String,
    required: true,
    maxlength: 500
  },
  explanation: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // RAG specific
  ragModel: {
    type: String,
    default: 'groq-rag'
  },
  groqModel: {
    type: String,
    default: 'llama-3.1-70b-versatile'
  },
  contextUsed: {
    type: [String],
    default: []
  },
  similarityScore: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Metadata
  generationTime: {
    type: Number,
    required: true
  },
  tokensUsed: {
    type: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
RAGTimerQuestionSchema.index({ roomId: 1, sessionId: 1 });
RAGTimerQuestionSchema.index({ transcriptId: 1 });
RAGTimerQuestionSchema.index({ createdAt: -1 });

// Method to format data for frontend
RAGTimerQuestionSchema.methods.getFormattedData = function() {
  return {
    id: this._id.toString(),
    roomId: this.roomId,
    sessionId: this.sessionId,
    transcriptId: this.transcriptId,
    hostId: this.hostId,
    
    type: this.type,
    difficulty: this.difficulty,
    question: this.question,
    options: this.options,
    correctAnswer: this.correctAnswer,
    explanation: this.explanation,
    
    ragModel: this.ragModel,
    groqModel: this.groqModel,
    contextUsed: this.contextUsed,
    similarityScore: this.similarityScore,
    
    generationTime: this.generationTime,
    tokensUsed: this.tokensUsed,
    
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const RAGTimerQuestion = mongoose.model<IRAGTimerQuestion>(
  'RAGTimerQuestion',
  RAGTimerQuestionSchema
);

export default RAGTimerQuestion;
