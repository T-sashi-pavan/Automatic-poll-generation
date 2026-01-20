// Direct test of AutoQuestionService without relying on routes

import { AutoQuestionService } from './src/services/autoQuestionService';
import { Segment } from './src/web/models/Segment';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testAutoQuestionService() {
  try {
    console.log('🧪 [TEST] Testing AutoQuestionService directly...');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ [TEST] Database connected');
    
    // Create a test segment
    const testSegment = new Segment({
      meetingId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      hostmail: 'test@example.com',
      segmentNumber: 999,
      transcriptText: 'Artificial intelligence and machine learning are transformative technologies that enable computers to learn from data and make intelligent decisions. These systems are being applied in healthcare, finance, autonomous vehicles, and many other domains to solve complex problems.',
      timestamp: new Date()
    });
    
    await testSegment.save();
    console.log('✅ [TEST] Test segment created:', testSegment._id);
    
    // Test AutoQuestionService
    const autoQuestionService = new AutoQuestionService();
    console.log('✅ [TEST] AutoQuestionService instance created');
    
    await autoQuestionService.generateQuestionsForSegment(
      testSegment._id.toString(),
      '507f1f77bcf86cd799439011'
    );
    
    console.log('✅ [TEST] Question generation completed successfully!');
    
    // Check if questions were saved
    const questionsResponse = await fetch('http://localhost:8000/api/segments/507f1f77bcf86cd799439011/questions');
    const questionsResult = await questionsResponse.json();
    
    console.log('📊 [TEST] Final result:', questionsResult);
    
  } catch (error) {
    console.error('❌ [TEST] Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAutoQuestionService();