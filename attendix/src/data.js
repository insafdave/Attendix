export const user = {
  id: "demo-user",
  name: "Demo User",
  college: "Your College",
  semester: "Semester 1",
  semesterStart: "2026-08-10",
  semesterEnd: "2026-12-18",
  targetAttendance: 85,
  maximumAttendance: 90,
};

export const subjects = [
  {
    id: 1,
    userId: "demo-user",
    name: "Mathematics",
    shortName: "Maths",
    present: 42,
    absent: 5,
  },
  {
    id: 2,
    userId: "demo-user",
    name: "Chemistry",
    shortName: "Chemistry",
    present: 38,
    absent: 6,
  },
  {
    id: 3,
    userId: "demo-user",
    name: "Engineering Graphics",
    shortName: "Graphics",
    present: 34,
    absent: 8,
  },
  {
    id: 4,
    userId: "demo-user",
    name: "Electrical Engineering",
    shortName: "Electrical",
    present: 40,
    absent: 5,
  },
  {
    id: 5,
    userId: "demo-user",
    name: "Algorithm of Thinking with Python",
    shortName: "Python",
    present: 44,
    absent: 3,
  },
];

export const initialAttendanceRecords = [
  {
    id: 1,
    userId: "demo-user",
    subjectId: 1,
    date: "2026-08-10",
    hour: 1,
    status: "present",
  },
  {
    id: 2,
    userId: "demo-user",
    subjectId: 2,
    date: "2026-08-10",
    hour: 2,
    status: "absent",
  },
  {
    id: 3,
    userId: "demo-user",
    subjectId: 2,
    date: "2026-08-12",
    hour: 3,
    status: "present",
  },
  {
    id: 4,
    userId: "demo-user",
    subjectId: 2,
    date: "2026-08-11",
    hour: 2,
    status: "absent",
  },
];

export const initialCollegeLeaves = [];
