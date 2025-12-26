// Direct RAG service test
const ragService = require('./apps/backend/src/services/ragService').default;

async function test() {
  try {
    console.log('🧪 Testing RAG segment question generation...\n');
    
    const questions = await ragService.generateSegmentQuestions({
      transcriptText: "Photosynthesis is the process by which plants convert sunlight into chemical energy.",
      transcriptId: "test-001",
      segmentId: "seg-001",
      sessionId: "sess-001",
      roomId: "room-001",
      hostId: "host-001",
      questionCount: 2
    });
    
    console.log('\n✅ Success! Generated questions:');
    console.log(JSON.stringify(questions, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

test();
