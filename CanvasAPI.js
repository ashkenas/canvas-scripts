const host = 'https://sit.instructure.com/api/v1/';

/**
 * Make a Canvas LMS REST request with credentials.
 */
const makeRequest = async (url, key, data, method = 'POST') => {
  const options = {
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    method: method
  };
  if (method.toLowerCase() !== 'get')
    options.body = JSON.stringify(data);

  const response = await fetch(host + url, options);

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
  constructor() {
    this.BASE_ENDPOINT = '';
    this.UPLOAD_ENDPOINT = '';
    this.KEY = '';
    this.ASSIGNMENT_ID = 0;
    this.COURSE_ID = 0;
    this.grade_data = {};
  }

  /**
   * Initialize this `BulkGradeUpdater`.
   * @param {string} apiKey API key of user to act as
   * @param {string|number} courseId ID of the course with the assignment
   * @param {string|number} assignmentId ID of the assignment to grade
   */
  async setParameters(apiKey, courseId, assignmentId) {
    if (typeof apiKey !== 'string')
      throw new Error('apiKey must be a string.');
    if (typeof courseId !== 'string' && typeof courseId !== 'number')
      throw new Error('courseId must be a string or number.');
    if (typeof assignmentId !== 'string' && typeof assignmentId !== 'number')
      throw new Error('assignmentId must be a string or number.');
    // Validate API key
    try {
      await makeRequest(`courses`, apiKey, {}, 'GET');
      this.KEY = apiKey;
    } catch (e) {
      throw new Error('Invalid or unauthorized API key.');
    }
    // Check that we can actually access the course and assignment requested
    await makeRequest(`courses/${courseId}`, apiKey, {}, 'GET');
    await makeRequest(`courses/${courseId}/assignments/${assignmentId}`, apiKey, {}, 'GET');
    // Everything checks out, finish initialization
    this.BASE_ENDPOINT = `/courses/${courseId}/assignments/${assignmentId}/submissions`;
    this.UPLOAD_ENDPOINT = `${this.BASE_ENDPOINT}/update_grades`;
    this.ASSIGNMENT_ID = assignmentId;
    this.COURSE_ID = courseId;

    return this;
  }

  /**
   * Grade a particular student for the configured assignment.
   * @param {string|number} studentId ID of the student to grade
   * @param {number} grade Grade to give the student
   * @param {string} [comment] Comment to leave on the submission
   */
  addStudent(studentId, grade, comment = undefined) {
    if (!this.BASE_ENDPOINT)
      throw new Error('Did not initialize (call setParameters), or initialization failed. Cannot add student.');
    if (typeof studentId !== 'string' && typeof studentId !== 'number')
      throw new Error('studentId must be a string or number.');
    if (typeof grade !== 'number')
      throw new Error('grade must be a number.');
    if (comment && typeof comment !== 'string')
      throw new Error('comment must be a string.');

    this.grade_data[studentId] = {
      posted_grade: grade.toString()
    };
    if (comment)
      this.grade_data[studentId].text_comment = comment;
  }

  /**
   * Update queued student data.
   * @param {string|number} studentId ID of the student to update
   * @param {number} [grade] New grade for student
   * @param {string} [comment] New comment for student
   */
  updateStudent(studentId, grade = undefined, comment = undefined) {
    if (!(studentId in this.grade_data))
      throw new Error('Student does not exist in queued data.');
    if (grade && typeof grade !== 'number')
      throw new Error('grade must be a number.');
    if (comment && typeof comment !== 'string')
      throw new Error('comment must be a string.');

    if (grade !== undefined)
      this.grade_data[studentId].grade = grade;
    if (comment === "" || comment === null)
      delete this.grade_data[studentId].text_comment;
    else if (comment !== undefined)
      this.grade_data[studentId].text_comment = comment;
  }

  /**
   * Update all added students.
   * @param {boolean} [commentsAsFiles] Flag to upload comments as text files
   * @returns {Promise<Response>}
   */
  async sendUpdate(commentsAsFiles = false) {
    if (!this.BASE_ENDPOINT)
      throw new Error('Did not initialize (call setParameters), or initialization failed. Cannot send update.');
    if (!Object.keys(this.grade_data).length)
      return;

    if (!commentsAsFiles) {
      return await makeRequest(this.UPLOAD_ENDPOINT, this.KEY, {
        grade_data: this.grade_data
      });
    }

    const failed = [];

    for (const studentId in this.grade_data) {
      const comment = this.grade_data[studentId].text_comment;
      if (!comment) continue;
      const endpoint = `${host}${this.BASE_ENDPOINT}/${studentId}/comments/files`;
      const fileName = `${this.ASSIGNMENT_ID}-${studentId}.txt`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fileName,
          content_type: 'text/plain',
          parent_folder_path: 'autograder/comments',
          size: comment.length
        })
      });
      if (!res.ok) { // Could not allocate file on server
        failed.push(studentId);
        continue;
      }
      const uploadTarget = await res.json();
      const formData = new FormData();
      for (const [key, value] of Object.entries(uploadTarget.upload_params)) {
        formData.append(key, value);
      }
      formData.append('file', new Blob([comment]));
      const res2 = await fetch(uploadTarget.upload_url, {
        method: 'POST',
        headers: {
          // 'Content-Type': 'multipart/form-data'
        },
        body: formData
      });
      if (!(res2.status === 201 || (res2.status >= 300 && res.status < 400))) {
        failed.push(studentId);
        continue;
      }
      delete this.grade_data[studentId].text_comment;
      const { id } = await res2.json();
      this.grade_data[studentId].file_ids = [id];
    }

    if (failed.length) {
      console.warn('Failed to convert the following students\' comments to files:');
      console.warn('- ' + failed.join('\n- '))
    }
    
    await makeRequest(this.UPLOAD_ENDPOINT, this.KEY, {
      grade_data: this.grade_data
    });
  }
};
