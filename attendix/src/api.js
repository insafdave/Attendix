const API_BASE_URL = "http://localhost:5000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("attendix_token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(response) {
  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem("attendix_token");
    localStorage.removeItem("attendix_user");

    const error = new Error(
      data.message || "Your session has expired. Please login again.",
    );

    error.sessionExpired = true;

    throw error;
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong with the server.");
  }

  return data;
}

export async function signupUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  return handleResponse(response);
}

export async function loginUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  return handleResponse(response);
}

export async function getSubjects() {
  const response = await fetch(`${API_BASE_URL}/subjects`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

export async function createSubject(subjectData) {
  const response = await fetch(`${API_BASE_URL}/subjects`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(subjectData),
  });

  return handleResponse(response);
}

export async function updateSubject(subjectId, subjectData) {
  const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(subjectData),
  });

  return handleResponse(response);
}

export async function deleteSubject(subjectId) {
  const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

export async function getAttendance() {
  const response = await fetch(`${API_BASE_URL}/attendance`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

export async function createAttendance(attendanceData) {
  const response = await fetch(`${API_BASE_URL}/attendance`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(attendanceData),
  });

  return handleResponse(response);
}

export async function updateAttendance(attendanceId, attendanceData) {
  const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(attendanceData),
  });

  return handleResponse(response);
}

export async function deleteAttendance(attendanceId) {
  const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

export async function getCollegeLeaves() {
  const response = await fetch(`${API_BASE_URL}/college-leaves`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

export async function createCollegeLeave(date) {
  const response = await fetch(`${API_BASE_URL}/college-leaves`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ date }),
  });

  return handleResponse(response);
}

export async function deleteCollegeLeave(leaveId) {
  const response = await fetch(`${API_BASE_URL}/college-leaves/${leaveId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

export async function updateCurrentUser(
  name,
  email,
  college,
  semester,
  semesterStart,
  semesterEnd,
  targetAttendance = 85,
  maximumAttendance = 90,
) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name,
      email,
      college,
      semester,
      semester_start: semesterStart,
      semester_end: semesterEnd,
      target_attendance: targetAttendance,
      maximum_attendance: maximumAttendance,
    }),
  });

  return handleResponse(response);
}
