import { CohereClient } from 'cohere-ai';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface SearchResult {
  text: string;
  similarity: number;
  metadata?: any;
}

class CohereService {
  private client: CohereClient;
  private embedModel: string;
  private rerankModel: string;

  constructor() {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('COHERE_API_KEY not found in environment variables');
    }

    this.embedModel = process.env.COHERE_EMBED_MODEL || 'embed-english-v3.0';
    this.rerankModel = process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0';

    this.client = new CohereClient({
      token: apiKey,
    });

    console.log('🎯 [COHERE] Service initialized');
    console.log(`📊 [COHERE] Embed Model: ${this.embedModel}`);
    console.log(`🔄 [COHERE] Rerank Model: ${this.rerankModel}`);
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🔢 [COHERE] Generating embedding for text (${text.length} chars)`);

      const response = await this.client.embed({
        texts: [text],
        model: this.embedModel,
        inputType: 'search_document',
        embeddingTypes: ['float']
      });

      // Handle both response formats
      const embedding = Array.isArray(response.embeddings) 
        ? response.embeddings[0] 
        : (response.embeddings as any).float?.[0];
      
      if (!embedding) {
        throw new Error('No embedding returned from Cohere');
      }

      console.log(`✅ [COHERE] Generated embedding with ${embedding.length} dimensions`);
      return embedding;
    } catch (error: any) {
      console.error('❌ [COHERE] Error generating embedding:', error);
      throw new Error(`Cohere embedding failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      console.log(`🔢 [COHERE] Generating ${texts.length} embeddings in batch`);

      const response = await this.client.embed({
        texts: texts,
        model: this.embedModel,
        inputType: 'search_document',
        embeddingTypes: ['float']
      });

      // Handle both response formats
      const embeddings = Array.isArray(response.embeddings)
        ? response.embeddings
        : (response.embeddings as any).float;

      if (!embeddings || embeddings.length === 0) {
        throw new Error('No embeddings returned from Cohere');
      }

      console.log(`✅ [COHERE] Generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error: any) {
      console.error('❌ [COHERE] Error generating embeddings:', error);
      throw new Error(`Cohere batch embedding failed: ${error.message}`);
    }
  }

  /**
   * Generate query embedding (optimized for search queries)
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      console.log(`🔍 [COHERE] Generating query embedding for: "${query.substring(0, 50)}..."`);

      const response = await this.client.embed({
        texts: [query],
        model: this.embedModel,
        inputType: 'search_query',
        embeddingTypes: ['float']
      });

      // Handle both response formats
      const embedding = Array.isArray(response.embeddings)
        ? response.embeddings[0]
        : (response.embeddings as any).float?.[0];

      if (!embedding) {
        throw new Error('No query embedding returned from Cohere');
      }

      console.log(`✅ [COHERE] Generated query embedding with ${embedding.length} dimensions`);
      return embedding;
    } catch (error: any) {
      console.error('❌ [COHERE] Error generating query embedding:', error);
      throw new Error(`Cohere query embedding failed: ${error.message}`);
    }
  }

  /**
   * Rerank documents based on relevance to query
   */
  async rerank(query: string, documents: string[], topK: number = 5): Promise<SearchResult[]> {
    try {
      console.log(`🔄 [COHERE] Reranking ${documents.length} documents, top ${topK}`);

      const response = await this.client.rerank({
        query: query,
        documents: documents,
        model: this.rerankModel,
        topN: topK,
      });

      const results: SearchResult[] = response.results.map((result) => ({
        text: documents[result.index],
        similarity: result.relevanceScore,
        metadata: { index: result.index }
      }));

      console.log(`✅ [COHERE] Reranked to ${results.length} most relevant documents`);
      return results;
    } catch (error: any) {
      console.error('❌ [COHERE] Error reranking:', error);
      throw new Error(`Cohere reranking failed: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }

  /**
   * Find most similar texts from a list
   */
  async findSimilar(
    queryText: string,
    candidateTexts: string[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    try {
      console.log(`🔍 [COHERE] Finding ${topK} similar texts from ${candidateTexts.length} candidates`);

      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(queryText);

      // Generate embeddings for all candidates
      const candidateEmbeddings = await this.generateEmbeddings(candidateTexts);

      // Calculate similarities
      const similarities = candidateEmbeddings.map((embedding, index) => ({
        text: candidateTexts[index],
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        metadata: { index }
      }));

      // Sort by similarity and take top K
      const topResults = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      console.log(`✅ [COHERE] Found ${topResults.length} similar texts`);
      topResults.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Similarity: ${result.similarity.toFixed(4)} - "${result.text.substring(0, 60)}..."`);
      });

      return topResults;
    } catch (error: any) {
      console.error('❌ [COHERE] Error finding similar texts:', error);
      throw new Error(`Cohere similarity search failed: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 [COHERE] Testing API connection...');

      const testText = 'This is a test sentence for embedding.';
      const embedding = await this.generateEmbedding(testText);

      console.log('✅ [COHERE] Connection successful!');
      console.log(`📊 [COHERE] Embedding dimensions: ${embedding.length}`);

      return true;
    } catch (error: any) {
      console.error('❌ [COHERE] Connection test failed:', error.message);
      return false;
    }
  }
}

export const cohereService = new CohereService();
export default cohereService;
