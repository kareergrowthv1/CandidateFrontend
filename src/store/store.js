/**
 * Redux Store Configuration
 */
import { configureStore } from '@reduxjs/toolkit';
import testDataReducer from './slices/testDataSlice';
import dailyQuizReducer from './slices/dailyQuizSlice';

export const store = configureStore({
  reducer: {
    testData: testDataReducer,
    dailyQuiz: dailyQuizReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// TypeScript types (if using TypeScript)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
