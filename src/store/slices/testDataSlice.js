/**
 * Test Data Slice - verify-only for test portal.
 * Only verifyEmailAndOTP is used after email/OTP; no fetchAllTestData in test flow (instructions/summary from verify response).
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// verifyEmailAndOTP is stubbed out as the old test flow is removed
export const verifyEmailAndOTP = createAsyncThunk(
  'testData/verifyEmailAndOTP',
  async (payload, { rejectWithValue }) => {
    try {
      // Logic removed as part of cleanup
      return {};
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAllTestData = createAsyncThunk(
  'testData/fetchAllTestData',
  async ({ positionId, questionSetId }, { dispatch, rejectWithValue }) => {
    try {
      // Fetch all data in parallel
      const [positionData, questionSetData, questionSectionData, instructionsData] = await Promise.allSettled([
        positionId ? positionService.getPositionById(positionId) : Promise.resolve(null),
        questionSetId ? questionSetService.getQuestionSetById(questionSetId) : Promise.resolve(null),
        questionSetId ? questionSectionService.getQuestionSectionByQuestionSet(questionSetId) : Promise.resolve(null),
        instructionService.getInstructionsByQuestionSet(questionSetId || '')
      ]);

      return {
        position: positionData.status === 'fulfilled' ? positionData.value : null,
        questionSet: questionSetData.status === 'fulfilled' ? questionSetData.value : null,
        questionSection: questionSectionData.status === 'fulfilled' ? questionSectionData.value : null,
        instructions: instructionsData.status === 'fulfilled' ? instructionsData.value : [],
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  // Verification data
  verificationData: null,
  verificationLoading: false,
  verificationError: null,

  // Test data
  position: null,
  questionSet: null,
  questionSection: null,
  instructions: [],

  loading: { all: false },
  errors: { all: null },
};

const testDataSlice = createSlice({
  name: 'testData',
  initialState,
  reducers: {
    clearTestData: (state) => {
      state.verificationData = null;
      state.position = null;
      state.questionSet = null;
      state.questionSection = null;
      state.instructions = [];
      state.verificationError = null;
      state.errors.all = null;
    },
    clearErrors: (state) => {
      state.verificationError = null;
      state.errors.all = null;
    },
  },
  extraReducers: (builder) => {
    // Verify Email and OTP
    builder
      .addCase(verifyEmailAndOTP.pending, (state) => {
        state.verificationLoading = true;
        state.verificationError = null;
      })
      .addCase(verifyEmailAndOTP.fulfilled, (state, action) => {
        state.verificationLoading = false;
        state.verificationData = action.payload;
        state.verificationError = null;
      })
      .addCase(verifyEmailAndOTP.rejected, (state, action) => {
        state.verificationLoading = false;
        state.verificationError = action.payload;
      });

    // Fetch All Test Data
    builder
      .addCase(fetchAllTestData.pending, (state) => {
        state.loading.all = true;
        state.errors.all = null;
      })
      .addCase(fetchAllTestData.fulfilled, (state, action) => {
        state.loading.all = false;
        state.position = action.payload.position;
        state.questionSet = action.payload.questionSet;
        state.questionSection = action.payload.questionSection;
        state.instructions = action.payload.instructions || [];
        state.errors.all = null;
      })
      .addCase(fetchAllTestData.rejected, (state, action) => {
        state.loading.all = false;
        state.errors.all = action.payload;
      });
  },
});

export const { clearTestData, clearErrors } = testDataSlice.actions;
export default testDataSlice.reducer;
