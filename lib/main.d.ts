/**
 * Wrapper on Canvas LMS REST call for bulk submission grading.
 * Must call `setParameters` to initialize.
 * @example
 * const updater = await new BulkGradeUpdater().setParameters(apiKey, courseId, assignmentId);
 * updater.addStudent(1001, 97, "-3, no name.");
 * updater.addStudent(1002, 100, "Full marks.");
 * await updater.sendUpdate();
 */
 export declare class BulkGradeUpdater {
  /**
   * Do not use constructor alone. Also invoke `setParameters`.
   * @example
   * const updater = await new BulkGradeUpdater().setParameters(apiKey, courseId, assignmentId);
   */
  constructor();
  /**
   * Initialize this `BulkGradeUpdater`.
   * @param {string} apiKey API key of user to act as
   * @param {string|number} courseId ID of the course with the assignment
   * @param {string|number} assignmentId ID of the assignment to grade
   */
  setParameters(apiKey: string, courseId: string|number, assignmentId: string|number): Promise<BulkGradeUpdater>;
  /**
   * Grade a particular student for the configured assignment.
   * @param {string|number} studentId ID of the student to grade
   * @param {number} grade Grade to give the student
   * @param {string} [comment] Comment to leave on the submission
   */
  addStudent(studentId: string|number, grade: number, comment?: string): void;
  /**
   * Update queued student data.
   * @param {string|number} studentId ID of the student to update
   * @param {number} [grade] New grade for student
   * @param {string} [comment] New comment for student
   */
  updateStudent(studentId: string|number, grade?: number, comment?: string): void;
  /**
   * Update all added students.
   */
  sendUpdate(): Promise<Response>;
}
