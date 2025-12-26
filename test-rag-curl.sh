#!/bin/bash

# Test RAG Segment Question Generation
echo "=== Testing RAG Segment Question Generation ==="

curl -X POST http://localhost:8000/api/rag-questions/segment/generate \
  -H "Content-Type: application/json" \
  -d '{
    "transcriptText": "Photosynthesis is the process by which plants convert sunlight into chemical energy. During photosynthesis, plants absorb carbon dioxide from the air and water from the soil. Using the energy from sunlight, they convert these into glucose and oxygen. The glucose is used as food for the plant, while oxygen is released as a byproduct.",
    "transcriptId": "test-transcript-001",
    "segmentId": "test-segment-001",
    "sessionId": "test-session-001",
    "roomId": "test-room-rag-demo",
    "hostId": "test-host-001",
    "questionCount": 3
  }' | python -m json.tool

echo -e "\n\n=== Waiting 12 seconds for question generation... ===\n"
sleep 12

echo "=== Fetching Generated Segment Questions ==="
curl -s http://localhost:8000/api/rag-questions/segment/room/test-room-rag-demo | python -m json.tool

echo -e "\n\n=== Testing RAG Timer Question Generation ==="

curl -X POST http://localhost:8000/api/rag-questions/timer/generate \
  -H "Content-Type: application/json" \
  -d '{
    "transcriptText": "Climate change is one of the most pressing issues facing our planet. Rising global temperatures are causing ice caps to melt, sea levels to rise, and extreme weather events to become more frequent. Scientists agree that human activity, particularly the burning of fossil fuels, is the primary driver of climate change.",
    "transcriptId": "test-timer-transcript-001",
    "sessionId": "test-session-002",
    "roomId": "test-room-rag-timer",
    "hostId": "test-host-001",
    "questionCount": 3
  }' | python -m json.tool

echo -e "\n\n=== Waiting 12 seconds for timer questions... ===\n"
sleep 12

echo "=== Fetching Generated Timer Questions ==="
curl -s http://localhost:8000/api/rag-questions/timer/room/test-room-rag-timer | python -m json.tool

echo -e "\n\n✅ RAG System Test Complete!"
