export function getUserSubjects(subjects, userId) {
  return subjects.filter((subject) => subject.userId === userId);
}

export function getUserAttendanceRecords(records, userId) {
  return records.filter((record) => record.userId === userId);
}

export function getUserCollegeLeaves(leaves, userId) {
  return leaves.filter((leave) => leave.userId === userId);
}