import fetch from "node-fetch";

const host = 'https://sit.instructure.com/api/v1';

/**
 * Make a Canvas LMS REST request with credentials.
 */
const makeRequest = async (url, key, data, method = 'POST') => {
    const response = await fetch(host + url, {
        body: JSON.stringify(data),
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-type': 'application/json'
        },
        method: method
    });

    if (response.ok) return response;
    if (response.status === 400)
        throw new Error(`Bad request to ${url}`);
    if (response.status === 401)
        throw new Error(`Unathorized request to ${url}`);
    if (response.status === 403)
        throw new Error(`Forbidden request to ${url}`);
    if (response.status === 404)
        throw new Error(`No resource found at ${url}`);
    throw new Error(`Unexpected HTTP response code '${response.status}'`);
}

/**
 * Wrapper on Canvas LMS REST call for bulk submission grading.
 * Must call `setParameters` to initialize.
 * @example
 * const updater = await new BulkGradeUpdater().setParameters(apiKey, courseId, assignmentId);
 * updater.addStudent(1001, 97, "-3, no name.");
 * updater.addStudent(1002, 100, "Full marks.");
 * await updater.sendUpdate();
 */
export class BulkGradeUpdater {
    /**
     * Do not use constructor alone. Also invoke `setParameters`.
     * @example
     * const updater = await new BulkGradeUpdater().setParameters(apiKey, courseId, assignmentId);
     */
    constructor() { }

    /**
     * Initialize this `BulkGradeUpdater`.
     * @param {string} apiKey API key of user to act as
     * @param {string|number} courseId ID of the course with the assignment
     * @param {string|number} assignmentId ID of the assignment to grade
     */
    async setParameters(apiKey, courseId, assignmentId) {
        if (typeof apiKey !== 'string')
            throw 'apiKey must be a string.'
        if (typeof courseId !== 'string' && typeof courseId !== 'number')
            throw 'courseId must be a string or number.'
        if (typeof assignmentId !== 'string' && typeof assignmentId !== 'number')
            throw 'assignmentId must be a string or number.'
        // Validate API key
        try {
            this.KEY = await makeRequest(`courses/`, apiKey, {}, 'GET');
        } catch (e) {
            throw new Error('Invalid or unauthorized API key.');
        }
        // Check that we can actually access the course and assignment requested
        await makeRequest(`courses/${courseId}`, apiKey, {}, 'GET');
        await makeRequest(`courses/${courseId}/assignments/${assignmentId}`, apiKey, {}, 'GET');
        // Everything checks out, finish initialization
        this.ENDPOINT = `courses/${courseId}/assignments/${assignmentId}/submissions/update_grades`;
        this.grade_data = {};

        return this;
    }

    /**
     * Grade a particular student for the configured assignment.
     * @param {string|number} studentId ID of the student to grade
     * @param {number} grade Grade to give the student
     * @param {string|undefined} comment Comment to leave on the submission.
     */
    addStudent(studentId, grade, comment) {
        if (!this.ENDPOINT)
            throw 'Did not initialize (call setParameters), or initialization failed. Cannot add student.'
        if (typeof studentId !== 'string' && typeof studentId !== 'number')
            throw 'studentId must be a string or number.'
        if (typeof grade !== 'number')
            throw 'grade must be a number.'
        if (typeof comment !== 'string')
            throw 'comment must be a string.'

        this.grade_data[studentId] = {
            posted_grade: grade.toString()
        };
        if (comment)
            this.grade_data[studentId].text_comment = comment;
    }

    /**
     * Update all added students and clear stored data.
     */
    async sendUpdate() {
        if (!this.ENDPOINT)
            throw 'Did not initialize (call setParameters), or initialization failed. Cannot send update.'
        if (!Object.keys(this.grade_data).length)
            return;

        await makeRequest(this.ENDPOINT, this.KEY, { grade_data: this.grade_data });
        this.grade_data = {};
    }
};
