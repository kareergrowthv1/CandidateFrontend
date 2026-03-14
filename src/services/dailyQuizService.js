/**
 * Daily Quiz Service – CandidateFrontend
 * Calls CandidateBackend endpoints for the daily quiz feature.
 */
import apiClient from './apiService';

export const dailyQuizService = {
    /**
     * Get today's quiz questions with this candidate's answer status.
     * @returns {Promise<{success, quizDate, questions}>}
     */
    getTodaysQuiz: async () => {
        const response = await apiClient.get('/api/daily-quiz/today');
        return response.data;
    },

    /**
     * Submit an answer for a quiz question.
     * Backend will reject if already answered (answer locking enforced server-side too).
     * @param {string} questionId
     * @param {number} selectedAnswerIndex
     * @returns {Promise<{success, isCorrect, correctAnswerIndex, explanation}>}
     */
    submitAnswer: async (questionId, selectedAnswerIndex) => {
        const response = await apiClient.post('/api/daily-quiz/submit-answer', {
            questionId,
            selectedAnswerIndex,
        });
        return response.data;
    },
};
