import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';

export const getProgrammingCourses = async () => {
    const response = await axios.get(`${API_BASE_URL}/api/programming/courses`);
    return response.data;
};

export const getProgrammingCourseBySlug = async (slug) => {
    const response = await axios.get(`${API_BASE_URL}/api/programming/courses/${slug}`);
    return response.data;
};

// ─── Per-language candidate progress ────────────────────────────────────────

/**
 * Get this candidate's progress in a specific language course.
 * Uses the per-language collection: javaCandidates, htmlCandidates, etc.
 */
export const getCandidateProgress = async (candidateId, courseSlug, options = {}) => {
    if (!candidateId || !courseSlug) return null;
    try {
        const { summary, moduleId, lessonId } = options;
        const params = new URLSearchParams();
        if (summary) params.append('summary', 'true');
        if (moduleId) params.append('moduleId', moduleId);
        if (lessonId) params.append('lessonId', lessonId);

        const res = await axios.get(`${API_BASE_URL}/api/programming/candidate-progress/${courseSlug}/${candidateId}?${params.toString()}`);
        return res.data;
    } catch {
        return null;
    }
};

/**
 * Start a course — creates a record in the language-specific collection.
 * Body: { candidateId, courseSlug, courseId }
 */
export const startCourse = async (candidateId, courseSlug, courseId) => {
    const response = await axios.post(`${API_BASE_URL}/api/programming/start-course`, {
        candidateId,
        courseSlug,
        courseId,
    });
    return response.data;
};

/**
 * Update candidate progress — pass any metadata fields to update dynamically.
 * e.g. { percentComplete: 20, lastLesson: 'lesson-id' }
 */
export const updateCandidateProgress = async (candidateId, courseSlug, metadata) => {
    const response = await axios.patch(
        `${API_BASE_URL}/api/programming/candidate-progress/${courseSlug}/${candidateId}`,
        { metadata }
    );
    return response.data;
};

/**
 * Mark a lesson as complete for this candidate.
 */
export const markLessonComplete = async (candidateId, courseSlug, lessonId, xpUpdate = null) => {
    const response = await axios.post(`${API_BASE_URL}/api/programming/complete-lesson`, {
        candidateId,
        courseSlug,
        lessonId,
        xpUpdate
    });
    return response.data;
};

/**
 * Mark a module as complete for this candidate.
 */
export const markModuleComplete = async (candidateId, courseSlug, moduleId, xpUpdate = null) => {
    const response = await axios.post(`${API_BASE_URL}/api/programming/complete-module`, {
        candidateId,
        courseSlug,
        moduleId,
        xpUpdate
    });
    return response.data;
};

// ─── Module lesson helpers ────────────────────────────────────────────────────

export const getLessonsByModuleId = async (moduleId) => {
    const response = await axios.get(`${API_BASE_URL}/api/programming/modules/${moduleId}/lessons`);
    return response.data;
};

export const getLessonById = async (lessonId) => {
    const response = await axios.get(`${API_BASE_URL}/api/programming/lessons/${lessonId}`);
    return response.data;
};
