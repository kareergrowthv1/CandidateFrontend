import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8003'}/api`;
const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:9000';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  return {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  };
};

export const aiMockService = {
  /**
   * Get candidate's mock rounds status
   */
  getRounds: async (candidateId) => {
    return axios.get(`${API_URL}/ai-mock/rounds?candidateId=${candidateId}`, {
      headers: getHeaders()
    });
  },

  /**
   * Get candidate interview sessions (paginated)
   */
  getSessions: async (params) => {
    const { candidateId, roundTitle, page = 1, limit = 15 } = params;
    let url = `${API_URL}/ai-mock/sessions?candidateId=${candidateId}&page=${page}&limit=${limit}`;
    if (roundTitle) url += `&roundTitle=${roundTitle}`;
    
    return axios.get(url, { headers: getHeaders() });
  },

  /**
   * Get single session details
   */
  getSessionDetails: async (id) => {
    return axios.get(`${API_URL}/ai-mock/sessions/${id}`, {
      headers: getHeaders()
    });
  },

  /**
   * Save round progress
   */
  submitProgress: async (data) => {
    return axios.post(`${API_URL}/ai-mock/submit`, data, {
      headers: getHeaders()
    });
  },

  /**
   * Generate 4 key interview topics via the dedicated Conversationalmessage API.
   * Calls POST /ai/generate-topics on the Streaming AI backend (port 9000).
   */
  generateTopics: async ({ roundTitle, messageText, candidateName }) => {
    const response = await axios.post(
      `${AI_BACKEND_URL}/ai/generate-topics`,
      { roundTitle, messageText, candidateName },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data; // { success, concepts: string[] }
  },

  /**
   * Generate interview questions (non-conv: all, conv: only 1st question)
   */
  generateQuestions: async (data) => {
    const response = await axios.post(
      `${AI_BACKEND_URL}/ai/mock/generate-questions`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  /**
   * Generate a follow-up cross-question based on the candidate's answer
   */
  crossQuestion: async (data) => {
    const response = await axios.post(
      `${AI_BACKEND_URL}/ai/mock/cross-question`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  /**
   * Save the completed session to MongoDB aimock collection
   */
  saveSession: async (data) => {
    const response = await axios.post(
      `${API_URL}/ai-mock/save-session`,
      data,
      { headers: getHeaders() }
    );
    return response.data;
  },

   /**
   * Generate an AI analysis report for the completed session
   */
  generateReport: async (data) => {
    const response = await axios.post(
      `${AI_BACKEND_URL}/ai/mock/generate-report`,
      {
        ...data,
        reportLevel: data.reportLevel // Explicitly pass reportLevel if present in data
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  /**
   * Robust SSE Stream Interaction
   * Uses fetch + ReadableStream + TextDecoder to handle streaming AI responses.
   */
  streamInteraction: async (payload, onChunk, onEnd, onError) => {
    try {
      const response = await fetch(`${API_URL}/ai-mock/stream`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process remaining buffer if any
          if (buffer.startsWith('data: ')) {
            this._processChunk(buffer, onChunk, onEnd, onError);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // Keep the last partial chunk

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.substring(6);
            if (dataStr === '[DONE]') {
              onEnd();
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                onChunk(data.content);
              }
              if (data.error) {
                onError(data.error);
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      onEnd();
    } catch (error) {
      console.error('Streaming Error:', error);
      onError(error.message);
    }
  },

  _processChunk: (chunk, onChunk, onEnd, onError) => {
    const dataStr = chunk.substring(6);
    if (dataStr === '[DONE]') {
      onEnd();
      return;
    }
    try {
      const data = JSON.parse(dataStr);
      if (data.content) onChunk(data.content);
      if (data.error) onError(data.error);
    } catch (e) {}
  }
};
