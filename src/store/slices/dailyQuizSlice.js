import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dailyQuizService } from '../../services/dailyQuizService';

/**
 * Fetch today's quiz questions.
 * Uses a same-day cache to avoid redundant API calls.
 */
export const fetchTodaysQuiz = createAsyncThunk(
    'dailyQuiz/fetchTodaysQuiz',
    async (forceRefresh = false, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const quizState = state.dailyQuiz;
            const today = new Date().toDateString();
            const cachedDate = quizState.quizDate ? new Date(quizState.quizDate).toDateString() : null;

            // Use cached data if same day and not forcing refresh
            if (
                !forceRefresh &&
                cachedDate === today &&
                quizState.questions &&
                quizState.questions.length > 0
            ) {
                return { questions: quizState.questions, quizDate: quizState.quizDate, fromCache: true };
            }

            const data = await dailyQuizService.getTodaysQuiz();
            return {
                questions: data.questions || [],
                quizDate: data.quizDate || today,
                fromCache: false,
            };
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || 'Failed to fetch daily quiz'
            );
        }
    },
    {
        condition: (forceRefresh, { getState }) => {
            if (forceRefresh) return true;
            const state = getState();
            const quizState = state.dailyQuiz;
            const today = new Date().toDateString();
            const cachedDate = quizState.quizDate ? new Date(quizState.quizDate).toDateString() : null;
            if (cachedDate === today && quizState.questions && quizState.questions.length > 0) {
                return false; // skip, use cache
            }
            return true;
        },
    }
);

/**
 * Submit an answer for a quiz question.
 * Once answered, the UI will lock all options for that question.
 */
export const submitQuizAnswer = createAsyncThunk(
    'dailyQuiz/submitAnswer',
    async ({ questionId, selectedAnswerIndex }, { rejectWithValue }) => {
        try {
            const result = await dailyQuizService.submitAnswer(questionId, selectedAnswerIndex);
            if (result.success) {
                return {
                    questionId,
                    selectedAnswerIndex,
                    isCorrect: result.isCorrect,
                    correctAnswerIndex: result.correctAnswerIndex,
                    explanation: result.explanation || '',
                };
            } else {
                return rejectWithValue(result.message || 'Failed to submit answer');
            }
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || 'Failed to submit answer'
            );
        }
    }
);

const initialState = {
    questions: [],
    quizDate: null,
    loading: false,
    submitting: false,
    error: null,
};

const dailyQuizSlice = createSlice({
    name: 'dailyQuiz',
    initialState,
    reducers: {
        clearDailyQuiz: (state) => {
            state.questions = [];
            state.quizDate = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch quiz
            .addCase(fetchTodaysQuiz.pending, (state) => {
                if (!state.questions || state.questions.length === 0) {
                    state.loading = true;
                }
                state.error = null;
            })
            .addCase(fetchTodaysQuiz.fulfilled, (state, action) => {
                state.loading = false;
                if (!action.payload.fromCache) {
                    state.questions = action.payload.questions;
                    state.quizDate = action.payload.quizDate;
                }
                state.error = null;
            })
            .addCase(fetchTodaysQuiz.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Submit answer — lock the question immediately on success
            .addCase(submitQuizAnswer.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(submitQuizAnswer.fulfilled, (state, action) => {
                state.submitting = false;
                const { questionId, selectedAnswerIndex, isCorrect, correctAnswerIndex, explanation } = action.payload;
                const question = state.questions.find((q) => q.questionId === questionId);
                if (question) {
                    question.answered = true;
                    question.selectedAnswerIndex = selectedAnswerIndex;
                    question.isCorrect = isCorrect;
                    question.correctAnswerIndex = correctAnswerIndex;
                    question.explanation = explanation;
                }
            })
            .addCase(submitQuizAnswer.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            });
    },
});

export const { clearDailyQuiz } = dailyQuizSlice.actions;
export default dailyQuizSlice.reducer;
