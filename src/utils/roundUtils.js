/**
 * Round navigation and management utilities
 */

/**
 * Check if all assigned rounds are completed
 * @param {Object} assessmentSummary - Assessment summary object
 * @returns {boolean} True if all assigned rounds are completed
 */
export const areAllRoundsCompleted = (assessmentSummary) => {
  if (!assessmentSummary) {
    return false;
  }

  const data = assessmentSummary?.data || assessmentSummary;
  
  // Check if all assigned rounds are completed
  const rounds = [
    { assigned: data.round1Assigned, completed: data.round1Completed },
    { assigned: data.round2Assigned, completed: data.round2Completed },
    { assigned: data.round3Assigned, completed: data.round3Completed },
    { assigned: data.round4Assigned, completed: data.round4Completed },
  ];

  // If no rounds are assigned, return false (can't be "all completed")
  const assignedRounds = rounds.filter(r => r.assigned === true);
  if (assignedRounds.length === 0) {
    return false;
  }

  // All assigned rounds must be completed
  return assignedRounds.every(r => r.completed === true);
};

/**
 * Get the next round to navigate to based on assessment summary
 * @param {Object} assessmentSummary - Assessment summary object
 * @returns {string|null} Next round number (1, 2, 3, 4) or null if all complete
 */
export const getNextRound = (assessmentSummary) => {
  if (!assessmentSummary) {
    return null;
  }

  const data = assessmentSummary?.data || assessmentSummary;
  
  // Check each round in order to find the next assigned but incomplete round
  // round1 = general, round2 = position, round3 = coding, round4 = aptitude
  if (data.round1Assigned && !data.round1Completed) {
    return 1;
  }
  if (data.round2Assigned && !data.round2Completed) {
    return 2;
  }
  if (data.round3Assigned && !data.round3Completed) {
    return 3;
  }
  if (data.round4Assigned && !data.round4Completed) {
    return 4;
  }
  
  // If all assigned rounds are completed
  return null;
};

/**
 * Get round name from round number
 * @param {number} roundNumber - Round number (1, 2, 3, 4)
 * @returns {string} Round name
 */
export const getRoundName = (roundNumber) => {
  const roundNames = {
    1: 'General',
    2: 'Position Specific',
    3: 'Coding',
    4: 'Aptitude',
  };
  return roundNames[roundNumber] || 'Unknown';
};

/**
 * Get round route from round number
 * @param {number} roundNumber - Round number (1, 2, 3, 4)
 * @returns {string} Route path
 */
export const getRoundRoute = (roundNumber) => {
  return `/round-${roundNumber}`;
};

/**
 * Get round timing from assessment summary (uses roundNGivenTime from API, fallback to roundNTime).
 * @param {Object} assessmentSummary - Assessment summary object
 * @param {number} roundNumber - Round number (1, 2, 3, 4)
 * @returns {string|null} Round time in hh:mm:ss format or null
 */
export const getRoundTime = (assessmentSummary, roundNumber) => {
  if (!assessmentSummary) {
    return null;
  }

  const data = assessmentSummary?.data || assessmentSummary;
  const timeFields = {
    1: ['round1AssignedTime', 'round1GivenTime', 'round1Time'],
    2: ['round2AssignedTime', 'round2GivenTime', 'round2Time'],
    3: ['round3AssignedTime', 'round3GivenTime', 'round3Time'],
    4: ['round4AssignedTime', 'round4GivenTime', 'round4Time'],
  };

  const fields = timeFields[roundNumber];
  if (!fields) return null;
  for (const field of fields) {
    if (data[field]) return data[field];
  }
  return null;
};

/**
 * Check if a round is assigned
 * @param {Object} assessmentSummary - Assessment summary object
 * @param {number} roundNumber - Round number (1, 2, 3, 4)
 * @returns {boolean} True if round is assigned
 */
export const isRoundAssigned = (assessmentSummary, roundNumber) => {
  if (!assessmentSummary) {
    return false;
  }

  const data = assessmentSummary?.data || assessmentSummary;
  const assignedFields = {
    1: 'round1Assigned',
    2: 'round2Assigned',
    3: 'round3Assigned',
    4: 'round4Assigned',
  };

  const assignedField = assignedFields[roundNumber];
  return data[assignedField] === true;
};

/**
 * Check if a round is completed
 * @param {Object} assessmentSummary - Assessment summary object
 * @param {number} roundNumber - Round number (1, 2, 3, 4)
 * @returns {boolean} True if round is completed
 */
export const isRoundCompleted = (assessmentSummary, roundNumber) => {
  if (!assessmentSummary) {
    return false;
  }

  const data = assessmentSummary?.data || assessmentSummary;
  const completedFields = {
    1: 'round1Completed',
    2: 'round2Completed',
    3: 'round3Completed',
    4: 'round4Completed',
  };

  const completedField = completedFields[roundNumber];
  return data[completedField] === true;
};

/**
 * Get questions for a specific round from question section
 * @param {Object} questionSection - Question section object
 * @param {number} roundNumber - Round number (1, 2, 3, 4)
 * @returns {Array} Array of questions for the round
 */
export const getRoundQuestions = (questionSection, roundNumber) => {
  if (!questionSection) {
    return [];
  }

  const data = questionSection?.data || questionSection;

  switch (roundNumber) {
    case 1:
      // General questions
      return data.generalQuestions?.questions || [];
    case 2:
      // Position specific questions
      return data.positionSpecificQuestions?.questions || [];
    case 3:
      // Coding questions
      return data.codingQuestions || [];
    case 4:
      // Aptitude questions
      return data.aptitudeQuestions || [];
    default:
      return [];
  }
};

export default {
  areAllRoundsCompleted,
  getNextRound,
  getRoundName,
  getRoundRoute,
  getRoundTime,
  isRoundAssigned,
  isRoundCompleted,
  getRoundQuestions,
};
