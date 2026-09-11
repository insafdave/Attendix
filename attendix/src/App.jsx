import { useEffect, useState } from "react";
import {
  user,
  subjects as initialSubjects,
  initialAttendanceRecords,
  initialCollegeLeaves,
} from "./data";
import {
  getAttendancePercentage,
  getAttendanceStatus,
  getClassesNeeded,
  getClassesNeededForGoal,
  getClassesCanMiss,
  getAttendancePrediction,
} from "./attendance";
import { getGreeting } from "./greeting";
import Auth from "./Auth";
import {
  getUserSubjects,
  getUserAttendanceRecords,
  getUserCollegeLeaves,
} from "./userData";
import {
  createSubject,
  updateSubject,
  deleteSubject as deleteSubjectAPI,
  createAttendance,
  updateAttendance,
  deleteAttendance as deleteAttendanceAPI,
  createCollegeLeave,
  getCollegeLeaves,
  getSubjects,
  getAttendance,
  deleteCollegeLeave,
  getCurrentUser,
  updateCurrentUser,
} from "./api";

function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState(() => {
    const savedUser = localStorage.getItem("attendix_user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("attendix_user");
      localStorage.removeItem("attendix_token");
      return null;
    }
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogin = (user) => {
    setShowLogoutModal(false);

    setSubjects([]);
    setAttendanceRecords([]);
    setCollegeLeaves([]);
    setDataLoadError("");
    setSessionExpired(false);
    setDataLoading(true);

    setAuthenticatedUser(user);
  };
  const handleLogout = () => {
    localStorage.removeItem("attendix_token");
    localStorage.removeItem("attendix_user");

    setSubjects([]);
    setAttendanceRecords([]);
    setCollegeLeaves([]);
    setDataLoadError("");
    setDataLoading(true);

    setAuthenticatedUser(null);
  };
  const startProfileEdit = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setProfileName(authenticatedUser.name);
    setProfileEmail(authenticatedUser.email);
    setTargetAttendance(authenticatedUser.target_attendance || 85);
    setMaximumAttendance(authenticatedUser.maximum_attendance || 90);
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setEditingProfile(false);
    setProfileName("");
    setProfileEmail("");
    setTargetAttendance(authenticatedUser.target_attendance || 85);
    setMaximumAttendance(authenticatedUser.maximum_attendance || 90);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const saveProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim()) {
      setErrorMessage("Name and email are required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(profileEmail.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (
      profileName.trim() === authenticatedUser.name &&
      profileEmail.trim() === authenticatedUser.email &&
      targetAttendance === (authenticatedUser.target_attendance || 85) &&
      maximumAttendance === (authenticatedUser.maximum_attendance || 90)
    ) {
      setErrorMessage("");
      setSuccessMessage("No changes to save.");
      return;
    }

    try {
      setErrorMessage("");
      setProfileSaving(true);
      setSuccessMessage("");

      const response = await updateCurrentUser(
        profileName.trim(),
        profileEmail.trim(),
        authenticatedUser.college || "Your College",
        authenticatedUser.semester || "Semester 1",
        authenticatedUser.semester_start || "2026-08-10",
        authenticatedUser.semester_end || "2026-12-18",
        targetAttendance,
        maximumAttendance,
      );

      if (response.user) {
        setAuthenticatedUser(response.user);
        localStorage.setItem("attendix_user", JSON.stringify(response.user));
        setTargetAttendance(response.user.target_attendance || 85);
        setMaximumAttendance(response.user.maximum_attendance || 90);
      }

      setEditingProfile(false);
      setErrorMessage("");
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update error:", error);
      setErrorMessage(error.message || "Unable to update your profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveAttendanceGoals = async () => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setProfileSaving(true);

      const response = await updateCurrentUser(
        authenticatedUser.name,
        authenticatedUser.email,
        authenticatedUser.college || "Your College",
        authenticatedUser.semester || "Semester 1",
        authenticatedUser.semester_start || "2026-08-10",
        authenticatedUser.semester_end || "2026-12-18",
        targetAttendance,
        maximumAttendance,
      );

      if (response.user) {
        setAuthenticatedUser(response.user);

        localStorage.setItem("attendix_user", JSON.stringify(response.user));

        setTargetAttendance(response.user.target_attendance || 85);
        setMaximumAttendance(response.user.maximum_attendance || 90);
      }

      setSuccessMessage("Attendance goals updated successfully.");
    } catch (error) {
      console.error("Attendance goals update error:", error);
      setErrorMessage(error.message || "Unable to update attendance goals.");
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    if (!authenticatedUser) return;

    const validateSession = async () => {
      try {
        const response = await getCurrentUser();

        if (response.user) {
          setAuthenticatedUser(response.user);
          localStorage.setItem("attendix_user", JSON.stringify(response.user));
        }
      } catch (error) {
        if (error.sessionExpired) {
          setSessionExpired(true);
          setAuthenticatedUser(null);
        }

        console.error("Session validation error:", error);
      }
    };

    validateSession();
  }, []);

  const [subjects, setSubjects] = useState(initialSubjects);
  const [attendanceRecords, setAttendanceRecords] = useState(
    initialAttendanceRecords,
  );
  const [collegeLeaves, setCollegeLeaves] = useState(initialCollegeLeaves);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [attendanceType, setAttendanceType] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceHour, setAttendanceHour] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!errorMessage && !successMessage) return;

    const timer = setTimeout(() => {
      setErrorMessage("");
      setSuccessMessage("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [errorMessage, successMessage]);

  const [subjectName, setSubjectName] = useState("");
  const [subjectShortName, setSubjectShortName] = useState("");
  const [dataLoadError, setDataLoadError] = useState("");
  useEffect(() => {
    if (!dataLoadError) return;

    const timer = setTimeout(() => {
      setDataLoadError("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [dataLoadError]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [targetAttendance, setTargetAttendance] = useState(85);
  const [maximumAttendance, setMaximumAttendance] = useState(90);

  const [editingAcademic, setEditingAcademic] = useState(false);
  const [academicSaving, setAcademicSaving] = useState(false);
  const [academicCollege, setAcademicCollege] = useState("");
  const [academicSemester, setAcademicSemester] = useState("");
  const [academicStart, setAcademicStart] = useState("");
  const [academicEnd, setAcademicEnd] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [serverConnected, setServerConnected] = useState(true);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [deleteSubject, setDeleteSubject] = useState(null);

  const [editingRecordId, setEditingRecordId] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [calendarDate, setCalendarDate] = useState(() => {
    const today = new Date();
    const semesterStart = new Date(
      authenticatedUser?.semester_start || "2026-08-10",
    );
    const semesterEnd = new Date(
      authenticatedUser?.semester_end || "2026-12-18",
    );

    if (today < semesterStart) {
      return new Date(semesterStart.getFullYear(), semesterStart.getMonth(), 1);
    }

    if (today > semesterEnd) {
      return new Date(semesterEnd.getFullYear(), semesterEnd.getMonth(), 1);
    }

    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [calendarSubjectFilter, setCalendarSubjectFilter] = useState("all");
  const [historySubjectFilter, setHistorySubjectFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
  const userSubjects = authenticatedUser
    ? getUserSubjects(subjects, authenticatedUser.id)
    : [];

  useEffect(() => {
    if (!authenticatedUser) return;

    const loadData = async () => {
      setDataLoading(true);
      setCollegeLeaves([]);
      setSubjects([]);
      setAttendanceRecords([]);

      try {
        setServerConnected(true);

        const [leavesResponse, subjectsResponse, attendanceResponse] =
          await Promise.all([
            getCollegeLeaves(),
            getSubjects(),
            getAttendance(),
          ]);

        if (leavesResponse.leaves) {
          const formattedLeaves = leavesResponse.leaves.map((leave) => ({
            id: leave.id,
            userId: leave.user_id,
            date: leave.date,
          }));

          setCollegeLeaves(formattedLeaves);
        }

        if (subjectsResponse.subjects) {
          const formattedSubjects = subjectsResponse.subjects.map(
            (subject) => ({
              id: subject.id,
              userId: subject.user_id,
              name: subject.name,
              shortName: subject.short_name,
              present: 0,
              absent: 0,
            }),
          );

          setSubjects(formattedSubjects);
        }

        if (attendanceResponse.records) {
          const formattedRecords = attendanceResponse.records.map((record) => ({
            id: record.id,
            userId: record.user_id,
            subjectId: record.subject_id,
            date: record.date,
            hour: record.hour,
            status: record.status,
          }));

          setAttendanceRecords(formattedRecords);
        }

        setDataLoadError("");
      } catch (error) {
        setServerConnected(false);

        if (error.sessionExpired) {
          setSessionExpired(true);
        }

        console.error("Data loading error:", error);

        setDataLoadError(error.message || "Unable to load your Attendix data.");
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [authenticatedUser]);

  const userAttendanceRecords = authenticatedUser
    ? getUserAttendanceRecords(attendanceRecords, authenticatedUser.id)
    : [];

  const userCollegeLeaves = authenticatedUser
    ? getUserCollegeLeaves(collegeLeaves, authenticatedUser.id)
    : [];
  const semesterStartDate = new Date(authenticatedUser.semester_start);
  const semesterEndDate = new Date(authenticatedUser.semester_end);

  const isAttendanceDateWithinSemester =
    attendanceDate >= authenticatedUser.semester_start &&
    attendanceDate <= authenticatedUser.semester_end;

  const isAttendanceDateCollegeLeave = userCollegeLeaves.some(
    (leave) => leave.date === attendanceDate,
  );
  const semesterStartMonth = new Date(
    semesterStartDate.getFullYear(),
    semesterStartDate.getMonth(),
    1,
  );

  const semesterEndMonth = new Date(
    semesterEndDate.getFullYear(),
    semesterEndDate.getMonth(),
    1,
  );

  const selectedDateRecords = selectedCalendarDate
    ? userAttendanceRecords.filter(
        (record) => record.date === selectedCalendarDate,
      )
    : [];

  const calendarSubjects = userSubjects
    .filter(
      (subject) =>
        calendarSubjectFilter === "all" ||
        subject.id === Number(calendarSubjectFilter),
    )
    .map((subject) => {
      const records = selectedDateRecords
        .filter((item) => item.subjectId === subject.id)
        .sort((a, b) => Number(a.hour) - Number(b.hour));

      return {
        ...subject,
        records,
      };
    })
    .filter((subject) => subject.records.length > 0);

  const filteredHistoryRecords = userAttendanceRecords.filter((record) => {
    const subject = userSubjects.find((item) => item.id === record.subjectId);

    const searchText = historySearch.trim().toLowerCase();

    const matchesSubject =
      historySubjectFilter === "all" ||
      record.subjectId === Number(historySubjectFilter);

    const matchesSearch =
      !searchText ||
      subject?.name.toLowerCase().includes(searchText) ||
      subject?.shortName.toLowerCase().includes(searchText) ||
      record.date.includes(searchText);

    return matchesSubject && matchesSearch;
  });

  const selectedHistoryRecords = selectedHistoryDate
    ? filteredHistoryRecords.filter(
        (record) => record.date === selectedHistoryDate,
      )
    : [];

  const selectedDatePresentCount = selectedDateRecords.filter(
    (record) => record.status === "present",
  ).length;

  const selectedDateAbsentCount = selectedDateRecords.filter(
    (record) => record.status === "absent",
  ).length;

  const selectedDateHourCount = selectedDateRecords.length;

  const subjectAttendance = userSubjects.map((subject) => {
    const records = userAttendanceRecords.filter(
      (record) => record.subjectId === subject.id,
    );

    const present = records.filter(
      (record) => record.status === "present",
    ).length;

    const absent = records.filter(
      (record) => record.status === "absent",
    ).length;

    const classesNeeded = getClassesNeeded(
      present,
      absent,
      authenticatedUser.target_attendance || 85,
    );

    const classesCanMiss = getClassesCanMiss(
      present,
      absent,
      authenticatedUser.target_attendance || 85,
    );

    const goalClassesNeeded = getClassesNeededForGoal(
      present,
      absent,
      authenticatedUser.maximum_attendance || 90,
    );

    const predictedAttendance = getAttendancePrediction(present, absent, 1);

    return {
      ...subject,
      present,
      absent,
      total: present + absent,
      percentage: getAttendancePercentage(present, absent),
      classesNeeded,
      classesCanMiss,
      goalClassesNeeded,
      predictedAttendance,
    };
  });

  const overallPresent = userAttendanceRecords.reduce(
    (total, record) => (record.status === "present" ? total + 1 : total),
    0,
  );

  const overallAbsent = userAttendanceRecords.reduce(
    (total, record) => (record.status === "absent" ? total + 1 : total),
    0,
  );

  const overallPercentage = getAttendancePercentage(
    overallPresent,
    overallAbsent,
  );

  const overallStatus = getAttendanceStatus(overallPercentage);

  const overallClassesNeeded = getClassesNeeded(
    overallPresent,
    overallAbsent,
    authenticatedUser.target_attendance || 85,
  );

  const overallClassesCanMiss = getClassesCanMiss(
    overallPresent,
    overallAbsent,
    authenticatedUser.target_attendance || 85,
  );

  const overallPredictedAttendance = getAttendancePrediction(
    overallPresent,
    overallAbsent,
    1,
  );

  const todayDate = new Date().toISOString().split("T")[0];

  const todayRecords = userAttendanceRecords.filter(
    (record) => record.date === todayDate,
  );

  const todayPresent = todayRecords.filter(
    (record) => record.status === "present",
  ).length;

  const todayAbsent = todayRecords.filter(
    (record) => record.status === "absent",
  ).length;

  const todayTotal = todayRecords.length;

  const excellentCount = subjectAttendance.filter(
    (subject) => subject.percentage >= 90,
  ).length;

  const targetCount = subjectAttendance.filter(
    (subject) => subject.percentage >= 85 && subject.percentage < 90,
  ).length;

  const warningCount = subjectAttendance.filter(
    (subject) => subject.percentage >= 75 && subject.percentage < 85,
  ).length;

  const criticalCount = subjectAttendance.filter(
    (subject) => subject.percentage < 75,
  ).length;

  const analyticsTotalClasses = overallPresent + overallAbsent;
  const analyticsTargetGap = Math.max(
    0,
    (authenticatedUser.target_attendance || 85) - overallPercentage,
  );
  const analyticsMaxGoalGap = Math.max(
    0,
    (authenticatedUser.maximum_attendance || 90) - overallPercentage,
  );

  const analyticsSubjectRanking = [...subjectAttendance].sort(
    (a, b) => b.percentage - a.percentage,
  );

  const analyticsBestSubject = analyticsSubjectRanking[0] ?? null;
  const analyticsNeedsAttention = analyticsSubjectRanking.filter(
    (subject) =>
      subject.percentage < (authenticatedUser.target_attendance || 85),
  );

  const resetSubjectForm = () => {
    setSubjectName("");
    setSubjectShortName("");
    setEditingSubjectId(null);
    setErrorMessage("");
  };

  const saveSubject = async () => {
    const name = subjectName.trim();
    const shortName = subjectShortName.trim();

    if (!name || !shortName) {
      setErrorMessage("Please enter both subject name and short name.");
      return;
    }

    const duplicate = userSubjects.some(
      (subject) =>
        subject.id !== editingSubjectId &&
        (subject.name.trim().toLowerCase() === name.toLowerCase() ||
          subject.shortName.trim().toLowerCase() === shortName.toLowerCase()),
    );

    if (duplicate) {
      setErrorMessage("A subject with this name or short name already exists.");
      return;
    }

    try {
      if (editingSubjectId) {
        const response = await updateSubject(editingSubjectId, {
          name,
          shortName,
        });

        if (!response.subject) {
          setErrorMessage(
            response.message || "Something went wrong while updating subject.",
          );
          return;
        }

        setSubjects((currentSubjects) =>
          currentSubjects.map((subject) =>
            subject.id === editingSubjectId
              ? {
                  ...subject,
                  name: response.subject.name,
                  shortName: response.subject.short_name,
                }
              : subject,
          ),
        );
      } else {
        const response = await createSubject({
          name,
          shortName,
        });

        if (!response.subject) {
          setErrorMessage(
            response.message || "Something went wrong while creating subject.",
          );
          return;
        }

        const newSubject = {
          id: response.subject.id,
          userId: response.subject.user_id,
          name: response.subject.name,
          shortName: response.subject.short_name,
          present: 0,
          absent: 0,
        };

        setSubjects((currentSubjects) => [...currentSubjects, newSubject]);
      }

      resetSubjectForm();
      setErrorMessage("");
    } catch (error) {
      console.error("Subject save error:", error);
      setErrorMessage("Unable to connect to the server.");
    }
  };

  const editSubject = (subject) => {
    setEditingSubjectId(subject.id);
    setSubjectName(subject.name);
    setSubjectShortName(subject.shortName);
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSubjectAndRecords = async (subject) => {
    try {
      const response = await deleteSubjectAPI(subject.id);

      if (response.message !== "Subject deleted successfully.") {
        setErrorMessage(
          response.message ||
            "Something went wrong while deleting the subject.",
        );
        return;
      }

      setSubjects((currentSubjects) =>
        currentSubjects.filter((item) => item.id !== subject.id),
      );

      setAttendanceRecords((currentRecords) =>
        currentRecords.filter((record) => record.subjectId !== subject.id),
      );

      if (selectedSubject === String(subject.id)) {
        setSelectedSubject("");
        setAttendanceType("");
        setAttendanceDate("");
        setAttendanceHour("");
      }

      if (editingSubjectId === subject.id) {
        resetSubjectForm();
      }

      setDeleteSubject(null);
      setErrorMessage("");
    } catch (error) {
      console.error("Subject deletion error:", error);
      setErrorMessage("Unable to connect to the server.");
    }
  };

  const markAttendance = async () => {
    setErrorMessage("");

    if (
      !selectedSubject ||
      !attendanceType ||
      !attendanceDate ||
      !attendanceHour
    ) {
      setErrorMessage("Please complete all fields before saving attendance.");
      return;
    }

    if (!isAttendanceDateWithinSemester) {
      setErrorMessage(
        `Attendance date must be between ${
          authenticatedUser?.semester_start || "2026-08-10"
        } and ${authenticatedUser?.semester_end || "2026-12-18"}.`,
      );
      return;
    }

    if (!/^[1-8]$/.test(String(attendanceHour))) {
      setErrorMessage("Please select a valid class hour from 1 to 8.");
      return;
    }

    if (isAttendanceDateCollegeLeave) {
      setErrorMessage("Attendance cannot be marked on a college leave date.");
      return;
    }

    const alreadyMarked = userAttendanceRecords.some(
      (record) =>
        record.subjectId === Number(selectedSubject) &&
        record.date === attendanceDate &&
        Number(record.hour) === Number(attendanceHour) &&
        record.id !== editingRecordId,
    );

    if (alreadyMarked) {
      setErrorMessage(
        "Attendance is already marked for this subject, date and hour.",
      );
      return;
    }

    try {
      if (editingRecordId) {
        const oldRecord = attendanceRecords.find(
          (record) => record.id === editingRecordId,
        );

        if (!oldRecord) {
          return;
        }

        const response = await updateAttendance(editingRecordId, {
          subjectId: Number(selectedSubject),
          date: attendanceDate,
          hour: Number(attendanceHour),
          status: attendanceType,
        });

        if (!response.record) {
          setErrorMessage(
            response.message ||
              "Something went wrong while updating attendance.",
          );
          return;
        }

        setAttendanceRecords((currentRecords) =>
          currentRecords.map((record) =>
            record.id === editingRecordId
              ? {
                  ...record,
                  subjectId: response.record.subject_id,
                  date: response.record.date,
                  hour: response.record.hour,
                  status: response.record.status,
                }
              : record,
          ),
        );

        setEditingRecordId(null);
      } else {
        const response = await createAttendance({
          subjectId: Number(selectedSubject),
          date: attendanceDate,
          hour: Number(attendanceHour),
          status: attendanceType,
        });

        if (!response.record) {
          setErrorMessage(
            response.message || "Something went wrong while saving attendance.",
          );
          return;
        }

        const newRecord = {
          id: response.record.id,
          userId: response.record.user_id,
          subjectId: response.record.subject_id,
          date: response.record.date,
          hour: response.record.hour,
          status: response.record.status,
        };

        setAttendanceRecords((currentRecords) => [
          ...currentRecords,
          newRecord,
        ]);
      }

      setSelectedSubject("");
      setAttendanceType("");
      setAttendanceDate("");
      setAttendanceHour("");
      setErrorMessage("");
    } catch (error) {
      console.error("Attendance save error:", error);
      setErrorMessage("Unable to connect to the server.");
    }
  };

  const markCollegeLeave = async (date) => {
    if (!date) return;

    const hasAttendance = userAttendanceRecords.some(
      (record) => record.date === date,
    );

    if (hasAttendance) {
      setErrorMessage(
        "College leave cannot be marked because attendance already exists for this date.",
      );
      return;
    }

    const alreadyLeave = userCollegeLeaves.some((leave) => leave.date === date);

    if (alreadyLeave) {
      setErrorMessage("College leave is already marked for this date.");
      return;
    }

    try {
      const response = await createCollegeLeave(date);

      if (!response.leave) {
        setErrorMessage(
          response.message ||
            "Something went wrong while saving college leave.",
        );
        return;
      }

      const newLeave = {
        id: response.leave.id,
        userId: response.leave.user_id,
        date: response.leave.date,
      };

      setCollegeLeaves((currentLeaves) => [...currentLeaves, newLeave]);

      setErrorMessage("");
    } catch (error) {
      console.error("College leave save error:", error);
      setErrorMessage("Unable to connect to the server.");
    }
  };

  const removeCollegeLeave = async (date) => {
    if (!date) return;

    const leave = userCollegeLeaves.find((item) => item.date === date);

    if (!leave) {
      return;
    }

    try {
      const response = await deleteCollegeLeave(leave.id);

      if (response.message !== "College leave deleted successfully.") {
        setErrorMessage(
          response.message ||
            "Something went wrong while deleting college leave.",
        );
        return;
      }

      setCollegeLeaves((currentLeaves) =>
        currentLeaves.filter((item) => item.id !== leave.id),
      );

      setErrorMessage("");
    } catch (error) {
      console.error("College leave deletion error:", error);
      setErrorMessage("Unable to connect to the server.");
    }
  };

  const editAttendance = (record) => {
    setEditingRecordId(record.id);
    setSelectedSubject(String(record.subjectId));
    setAttendanceDate(record.date);
    setAttendanceHour(String(record.hour));
    setAttendanceType(record.status);
    setErrorMessage("");

    setActivePage("dashboard");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteAttendance = async (record) => {
    try {
      const response = await deleteAttendanceAPI(record.id);

      if (response.message !== "Attendance deleted successfully.") {
        setErrorMessage(
          response.message || "Something went wrong while deleting attendance.",
        );
        return;
      }

      setAttendanceRecords((currentRecords) =>
        currentRecords.filter((item) => item.id !== record.id),
      );

      if (editingRecordId === record.id) {
        setEditingRecordId(null);
        setSelectedSubject("");
        setAttendanceType("");
        setAttendanceDate("");
        setAttendanceHour("");
      }

      setErrorMessage("");
    } catch (error) {
      console.error("Attendance deletion error:", error);
      setErrorMessage("Unable to connect to the server.");
    }
  };

  const cancelEdit = () => {
    setEditingRecordId(null);
    setSelectedSubject("");
    setAttendanceType("");
    setAttendanceDate("");
    setAttendanceHour("");
    setErrorMessage("");
  };

  const goToToday = () => {
    const today = new Date();

    setCalendarSubjectFilter("all");

    const semesterStart = new Date(
      authenticatedUser?.semester_start || "2026-08-10",
    );
    const semesterEnd = new Date(
      authenticatedUser?.semester_end || "2026-12-18",
    );

    let targetDate = today;

    if (today < semesterStart) {
      targetDate = semesterStart;
    } else if (today > semesterEnd) {
      targetDate = semesterEnd;
    }

    const targetDateString = `${targetDate.getFullYear()}-${String(
      targetDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

    setCalendarDate(
      new Date(targetDate.getFullYear(), targetDate.getMonth(), 1),
    );
    setSelectedCalendarDate(targetDateString);
  };

  if (!authenticatedUser) {
    return <Auth onLogin={handleLogin} sessionExpired={sessionExpired} />;
  }

  if (dataLoading) {
    return (
      <div className="data-loading-screen">
        <div className="data-loading-spinner"></div>
        <h2>Loading Attendix</h2>
        <p>Preparing your attendance data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {dataLoadError && (
        <div className="data-load-error">
          <span>⚠️</span>
          <p>{dataLoadError}</p>
        </div>
      )}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">A</div>

          <div>
            <h2>Attendix</h2>
            <span>Attendance System</span>
          </div>
        </div>

        <nav className="nav">
          <button
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            ▣ Dashboard
          </button>

          <button
            className={`nav-item ${activePage === "subjects" ? "active" : ""}`}
            onClick={() => setActivePage("subjects")}
          >
            ◫ Subjects
          </button>

          <button
            className={`nav-item ${activePage === "calendar" ? "active" : ""}`}
            onClick={() => setActivePage("calendar")}
          >
            ▦ Calendar
          </button>

          <button
            className={`nav-item ${activePage === "history" ? "active" : ""}`}
            onClick={() => setActivePage("history")}
          >
            ◷ History
          </button>

          <button
            className={`nav-item ${activePage === "analytics" ? "active" : ""}`}
            onClick={() => setActivePage("analytics")}
          >
            ◈ Analytics
          </button>

          <button
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
          >
            ⚙ Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <p>{authenticatedUser.semester || "Semester 1"}</p>

          <span>
            {authenticatedUser.semester_start || "2026-08-10"} →{" "}
            {authenticatedUser.semester_end || "2026-12-18"}
          </span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {activePage === "dashboard"
                ? "ATTENDANCE DASHBOARD"
                : activePage === "subjects"
                  ? "SUBJECT MANAGEMENT"
                  : activePage === "calendar"
                    ? "ATTENDANCE CALENDAR"
                    : activePage === "history"
                      ? "ATTENDANCE HISTORY"
                      : activePage === "analytics"
                        ? "ATTENDANCE ANALYTICS"
                        : "ATTENDIX"}
            </p>
          </div>

          <div
            className={`server-status ${serverConnected ? "connected" : "disconnected"}`}
          >
            <span className="server-status-dot"></span>
            <span>
              {serverConnected ? "Server Connected" : "Server Offline"}
            </span>
          </div>

          <div className="profile">
            <div className="avatar">
              {authenticatedUser.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{authenticatedUser.name}</strong>
              <span>{authenticatedUser.college || "Your College"}</span>
            </div>

            <button
              className="logout-button"
              onClick={() => setShowLogoutModal(true)}
            >
              Logout
            </button>
          </div>
        </header>

        {activePage === "dashboard" && (
          <>
            <section className="welcome">
              <p>YOUR ACADEMIC OVERVIEW</p>

              <h2>
                {getGreeting()}, {authenticatedUser.name} 👋
              </h2>
            </section>

            <section className="attendance-card">
              <div>
                <p>Overall Attendance</p>

                <h2>{overallPercentage}%</h2>

                <span className={overallStatus.type}>
                  {overallStatus.label}
                </span>
              </div>

              <div className="attendance-stats">
                <div>
                  <strong>{overallPresent}</strong>
                  <small>Present</small>
                </div>

                <div>
                  <strong>{overallAbsent}</strong>
                  <small>Absent</small>
                </div>

                <div>
                  <strong>{overallPresent + overallAbsent}</strong>
                  <small>Total</small>
                </div>
              </div>
            </section>

            {overallPercentage <
              (authenticatedUser.target_attendance || 85) && (
              <div className="overall-smart-warning">
                🎯 Attend the next {overallClassesNeeded} classes to reach{" "}
                {authenticatedUser.target_attendance || 85}% overall attendance.
              </div>
            )}

            {overallPercentage >= (authenticatedUser.target_attendance || 85) &&
              overallClassesCanMiss === 0 && (
                <div className="overall-smart-warning">
                  ⚠️ You cannot miss your next class without dropping below{" "}
                  {authenticatedUser.target_attendance || 85}% overall
                  attendance.
                </div>
              )}

            {overallPercentage < (authenticatedUser.target_attendance || 85) &&
              overallPredictedAttendance > overallPercentage && (
                <div className="overall-prediction">
                  📈 If you attend your next class, your overall attendance can
                  rise to {overallPredictedAttendance}%.
                </div>
              )}

            <section className="daily-insight">
              <div>
                <p>TODAY'S ATTENDANCE</p>
                <h3>Daily Overview</h3>
              </div>

              <div className="daily-insight-stats">
                <span>✓ {todayPresent} Present</span>
                <span>✕ {todayAbsent} Absent</span>
                <span>{todayTotal} Total Hours</span>
              </div>
            </section>

            <section className="smart-dashboard-summary">
              <div>
                <p>SMART INSIGHT</p>

                <h3>
                  {overallPercentage >=
                  (authenticatedUser.maximum_attendance || 90)
                    ? "Excellent! You're maintaining outstanding attendance."
                    : overallPercentage >=
                        (authenticatedUser.target_attendance || 85)
                      ? `You're on track. Keep attending classes to maintain ${
                          authenticatedUser.target_attendance || 85
                        }%.`
                      : `Your attendance needs attention. Focus on attending upcoming classes.`}
                </h3>
              </div>

              <div className="smart-summary-value">{overallPercentage}%</div>
            </section>

            <section className="attendance-entry">
              <div className="section-heading">
                <div>
                  <p>{editingRecordId ? "EDIT ATTENDANCE" : "QUICK ENTRY"}</p>

                  <h2>
                    {editingRecordId ? "Update Attendance" : "Mark Attendance"}
                  </h2>
                </div>
              </div>

              {errorMessage && (
                <div className="entry-error">
                  <span className="entry-error-icon">!</span>

                  <div>
                    <strong>Unable to save attendance</strong>

                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="entry-success">
                  <span className="entry-success-icon">✓</span>
                  <div>
                    <strong>Success</strong>
                    <p>{successMessage}</p>
                  </div>
                </div>
              )}

              {isAttendanceDateCollegeLeave && (
                <div className="entry-error entry-leave-warning">
                  <span className="entry-error-icon">🏖️</span>

                  <div>
                    <strong>College Leave</strong>

                    <p>Attendance cannot be recorded for this date.</p>
                  </div>
                </div>
              )}

              <div className="entry-box">
                <select
                  value={selectedSubject}
                  onChange={(event) => {
                    setSelectedSubject(event.target.value);
                    setErrorMessage("");
                  }}
                >
                  <option value="">Select Subject</option>

                  {userSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={attendanceDate}
                  min={authenticatedUser.semester_start}
                  max={authenticatedUser.semester_end}
                  onChange={(event) => {
                    setAttendanceDate(event.target.value);
                    setErrorMessage("");
                  }}
                />

                <select
                  value={attendanceHour}
                  onChange={(event) => {
                    setAttendanceHour(event.target.value);
                    setErrorMessage("");
                  }}
                >
                  <option value="">Select Hour</option>
                  {Array.from({ length: 8 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                      {index + 1 === 1
                        ? "st"
                        : index + 1 === 2
                          ? "nd"
                          : index + 1 === 3
                            ? "rd"
                            : "th"}{" "}
                      Hour
                    </option>
                  ))}
                </select>

                <div className="attendance-buttons">
                  <button
                    className={`attendance-option ${
                      attendanceType === "present" ? "selected-present" : ""
                    }`}
                    onClick={() => {
                      setAttendanceType("present");
                      setErrorMessage("");
                    }}
                  >
                    ✓ Present
                  </button>

                  <button
                    className={`attendance-option ${
                      attendanceType === "absent" ? "selected-absent" : ""
                    }`}
                    onClick={() => {
                      setAttendanceType("absent");
                      setErrorMessage("");
                    }}
                  >
                    ✕ Absent
                  </button>
                </div>

                <button className="save-attendance" onClick={markAttendance}>
                  {editingRecordId ? "Update Attendance" : "Save Attendance"}
                </button>

                {editingRecordId && (
                  <button className="cancel-edit" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </section>

            <section className="history-section">
              <div className="section-heading">
                <div>
                  <p>RECENT ACTIVITY</p>
                  <h2>Attendance History</h2>
                </div>

                <span className="history-count">
                  {userAttendanceRecords.length} Records
                </span>
              </div>

              {userAttendanceRecords.length === 0 ? (
                <div className="empty-history">
                  <div className="empty-history-icon">📋</div>

                  <h3>No attendance records yet</h3>

                  <p>Mark your first attendance using Quick Entry above.</p>
                </div>
              ) : (
                <div className="history-list">
                  {[...userAttendanceRecords]
                    .reverse()
                    .slice(0, 5)
                    .map((record) => {
                      const subject = userSubjects.find(
                        (item) => item.id === record.subjectId,
                      );

                      return (
                        <div
                          className={`history-item ${
                            selectedHistoryDate === record.date
                              ? "selected-history-date"
                              : ""
                          }`}
                          key={record.id}
                          onClick={() => setSelectedHistoryDate(record.date)}
                        >
                          <div
                            className="history-date"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "4px",
                            }}
                          >
                            <strong>{record.date}</strong>
                            <span
                              style={{
                                fontSize: "12px",
                                opacity: 0.65,
                              }}
                            >
                              {record.hour}
                              {record.hour === 1
                                ? "st"
                                : record.hour === 2
                                  ? "nd"
                                  : record.hour === 3
                                    ? "rd"
                                    : "th"}{" "}
                              Hour
                            </span>
                          </div>

                          <div className="history-subject">
                            <strong>
                              {subject?.name || "Unknown Subject"}
                            </strong>

                            <span>{subject?.shortName || "Subject"}</span>
                          </div>

                          <span className={`history-status ${record.status}`}>
                            {record.status === "present"
                              ? "✓ Present"
                              : "✕ Absent"}
                          </span>

                          <div className="history-actions">
                            <button
                              className="edit-record"
                              onClick={() => editAttendance(record)}
                            >
                              ✏
                            </button>

                            <button
                              className="delete-record"
                              onClick={() => setDeleteRecord(record)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            <section className="goals-grid">
              <div className="goal-card target-goal">
                <div className="goal-icon">🎯</div>

                <div>
                  <p>YOUR TARGET</p>

                  <h3>{authenticatedUser.target_attendance || 85}%</h3>

                  <span>Minimum goal to maintain</span>
                </div>
              </div>

              <div className="goal-card maximum-goal">
                <div className="goal-icon">🏆</div>

                <div>
                  <p>MAXIMUM GOAL</p>

                  <h3>{authenticatedUser.maximum_attendance || 90}%</h3>

                  <span>Push your attendance higher</span>
                </div>
              </div>
            </section>

            {subjectAttendance.some((subject) => subject.percentage < 75) && (
              <section className="critical-banner">
                <div className="critical-icon">🚨</div>

                <div>
                  <h3>Critical Attendance Alert</h3>

                  <p>
                    One or more subjects are below 75%. Attend upcoming classes
                    to improve your attendance.
                  </p>
                </div>
              </section>
            )}

            <section className="status-summary">
              <div className="summary-box">
                <span className="summary-number">{excellentCount}</span>

                <span className="summary-label">Excellent · 90%+</span>
              </div>

              <div className="summary-box">
                <span className="summary-number">{targetCount}</span>

                <span className="summary-label">On Target · 85–89%</span>
              </div>

              <div className="summary-box">
                <span className="summary-number">{warningCount}</span>

                <span className="summary-label">Needs Attention · 75–84%</span>
              </div>

              <div className="summary-box">
                <span className="summary-number">{criticalCount}</span>

                <span className="summary-label">Critical · Below 75%</span>
              </div>
            </section>

            <section className="subjects-section">
              <div className="section-heading">
                <div>
                  <p>SUBJECT PERFORMANCE</p>
                  <h2>Your Subjects</h2>
                </div>
              </div>

              <div className="subjects-grid">
                {subjectAttendance.map((subject) => {
                  const percentage = subject.percentage;

                  const status = getAttendanceStatus(percentage);

                  return (
                    <div className="subject-card" key={subject.id}>
                      <div className="subject-top">
                        <div>
                          <h3>{subject.name}</h3>
                          <p>{subject.shortName}</p>
                        </div>

                        <strong>{percentage}%</strong>
                      </div>

                      <div className="progress-track">
                        <div
                          className={`progress-fill ${status.type}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="subject-bottom">
                        <span className="target">
                          {subject.present} Present · {subject.absent} Absent
                        </span>

                        <span className={`status ${status.type}`}>
                          {status.label}
                        </span>
                      </div>

                      {percentage <
                        (authenticatedUser.target_attendance || 85) && (
                        <div className="recovery-info">
                          🎯 Attend the next{" "}
                          {getClassesNeeded(
                            subject.present,
                            subject.absent,
                            authenticatedUser.target_attendance || 85,
                          )}{" "}
                          classes to reach{" "}
                          {authenticatedUser.target_attendance || 85}%
                        </div>
                      )}

                      {percentage >=
                        (authenticatedUser.target_attendance || 85) &&
                        subject.classesCanMiss === 0 && (
                          <div className="smart-warning">
                            ⚠️ You cannot miss your next class without dropping
                            below {authenticatedUser.target_attendance || 85}%.
                          </div>
                        )}

                      {percentage <
                        (authenticatedUser.target_attendance || 85) &&
                        subject.predictedAttendance > percentage && (
                          <div className="prediction-info">
                            📈 If you attend your next class, your attendance
                            can rise to {subject.predictedAttendance}%.
                          </div>
                        )}

                      {percentage < 75 && (
                        <div className="critical-warning">
                          ⚠ Attendance is below 75%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activePage === "subjects" && (
          <section className="subjects-page">
            <section className="subjects-page-header">
              <div>
                <p className="eyebrow">SUBJECT MANAGEMENT</p>
                <h2>My Subjects</h2>
                <span>
                  Manage your subjects and track attendance performance.
                </span>
              </div>

              <div className="subjects-page-count">
                <strong>{subjectAttendance.length}</strong>
                <span>Subjects</span>
              </div>
            </section>

            <section className="subject-management-card">
              <div className="section-heading">
                <div>
                  <p>{editingSubjectId ? "EDIT SUBJECT" : "ADD SUBJECT"}</p>
                  <h2>
                    {editingSubjectId ? "Update Subject" : "Create New Subject"}
                  </h2>
                </div>
              </div>

              {errorMessage && (
                <div className="entry-error">
                  <span className="entry-error-icon">!</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="subject-form">
                <label>
                  <span>Subject Name</span>
                  <input
                    type="text"
                    value={subjectName}
                    placeholder="e.g. Mathematics"
                    onChange={(event) => {
                      setSubjectName(event.target.value);
                      setErrorMessage("");
                    }}
                  />
                </label>

                <label>
                  <span>Short Name</span>
                  <input
                    type="text"
                    value={subjectShortName}
                    placeholder="e.g. Maths"
                    onChange={(event) => {
                      setSubjectShortName(event.target.value);
                      setErrorMessage("");
                    }}
                  />
                </label>

                <div className="subject-form-actions">
                  <button className="save-subject-button" onClick={saveSubject}>
                    {editingSubjectId ? "Update Subject" : "Add Subject"}
                  </button>

                  {editingSubjectId && (
                    <button
                      className="cancel-subject-button"
                      onClick={resetSubjectForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="subjects-section subjects-page-section">
              <div className="section-heading">
                <div>
                  <p>ATTENDANCE OVERVIEW</p>
                  <h2>Subject Performance</h2>
                </div>
              </div>

              <div className="subjects-grid">
                {subjectAttendance.map((subject) => {
                  const percentage = subject.percentage;
                  const status = getAttendanceStatus(percentage);

                  return (
                    <div className="subject-card" key={subject.id}>
                      <div className="subject-top">
                        <div>
                          <h3>{subject.name}</h3>
                          <p>{subject.shortName}</p>
                        </div>

                        <strong>{percentage}%</strong>
                      </div>

                      <div className="progress-track">
                        <div
                          className={`progress-fill ${status.type}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <div className="subject-bottom">
                        <span className="target">
                          {subject.present} Present · {subject.absent} Absent
                        </span>

                        <span className={`status ${status.type}`}>
                          {status.label}
                        </span>
                      </div>

                      {percentage <
                        (authenticatedUser.target_attendance || 85) && (
                        <div className="recovery-info">
                          🎯 Attend the next{" "}
                          {getClassesNeeded(
                            subject.present,
                            subject.absent,
                            authenticatedUser.target_attendance || 85,
                          )}{" "}
                          classes to reach{" "}
                          {authenticatedUser.target_attendance || 85}%
                        </div>
                      )}

                      {percentage < 75 && (
                        <div className="critical-warning">
                          ⚠ Attendance is below 75%
                        </div>
                      )}

                      <div className="subject-card-actions">
                        <button
                          className="subject-edit-button"
                          onClick={() => editSubject(subject)}
                        >
                          ✏ Edit
                        </button>

                        <button
                          className="subject-delete-button"
                          onClick={() => setDeleteSubject(subject)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {subjectAttendance.length === 0 && (
                <div className="calendar-empty-date subject-empty-state">
                  <div className="calendar-empty-date-icon">📚</div>
                  <h3>No subjects yet</h3>
                  <p>
                    Add your first subject above to start tracking attendance.
                  </p>
                </div>
              )}
            </section>
          </section>
        )}

        {activePage === "history" && (
          <section className="page-section">
            <div className="section-heading">
              <div>
                <p>ATTENDANCE RECORDS</p>
                <h2>Attendance History</h2>
              </div>

              <span className="history-count">
                {userAttendanceRecords.length}{" "}
                {userAttendanceRecords.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            <div className="history-filter-row">
              <select
                className="history-subject-filter"
                value={historySubjectFilter}
                onChange={(event) =>
                  setHistorySubjectFilter(event.target.value)
                }
              >
                <option value="all">All Subjects</option>

                {userSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="history-search"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search history..."
              />
            </div>

            {filteredHistoryRecords.length === 0 ? (
              <div className="empty-history">
                <div className="empty-history-icon">📋</div>
                <h3>No attendance records yet</h3>
                <p>Mark attendance from the Dashboard to build your history.</p>
              </div>
            ) : (
              <div className="history-list">
                {[...filteredHistoryRecords]
                  .sort((a, b) => {
                    if (a.date !== b.date) return b.date.localeCompare(a.date);
                    return Number(b.hour) - Number(a.hour);
                  })
                  .map((record) => {
                    const subject = userSubjects.find(
                      (item) => item.id === record.subjectId,
                    );

                    return (
                      <div
                        className="history-item"
                        key={record.id}
                        onClick={() => setSelectedHistoryDate(record.date)}
                      >
                        <div
                          className="history-date"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "4px",
                          }}
                        >
                          <strong>{record.date}</strong>
                          <span style={{ fontSize: "12px", opacity: 0.65 }}>
                            {record.hour}
                            {record.hour === 1
                              ? "st"
                              : record.hour === 2
                                ? "nd"
                                : record.hour === 3
                                  ? "rd"
                                  : "th"}{" "}
                            Hour
                          </span>
                        </div>

                        <div className="history-subject">
                          <strong>{subject?.name || "Unknown Subject"}</strong>
                          <span>{subject?.shortName || "Subject"}</span>
                        </div>

                        <span className={`history-status ${record.status}`}>
                          {record.status === "present"
                            ? "✓ Present"
                            : "✕ Absent"}
                        </span>

                        <div className="history-actions">
                          <button
                            className="edit-record"
                            title="Edit attendance"
                            onClick={() => editAttendance(record)}
                          >
                            ✏
                          </button>
                          <button
                            className="delete-record"
                            title="Delete attendance"
                            onClick={() => setDeleteRecord(record)}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {selectedHistoryDate && (
              <div className="history-detail-panel">
                <div className="history-detail-header">
                  <div>
                    <p>DATE DETAILS</p>
                    <h3>{selectedHistoryDate}</h3>
                  </div>

                  <button
                    className="history-detail-close"
                    onClick={() => setSelectedHistoryDate(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="history-detail-summary">
                  <span>
                    ✓{" "}
                    {
                      selectedHistoryRecords.filter(
                        (record) => record.status === "present",
                      ).length
                    }{" "}
                    Present
                  </span>

                  <span>
                    ✕{" "}
                    {
                      selectedHistoryRecords.filter(
                        (record) => record.status === "absent",
                      ).length
                    }{" "}
                    Absent
                  </span>

                  <span>{selectedHistoryRecords.length} Total Hours</span>
                </div>

                <div className="history-detail-records">
                  {selectedHistoryRecords
                    .sort((a, b) => Number(a.hour) - Number(b.hour))
                    .map((record) => {
                      const subject = userSubjects.find(
                        (item) => item.id === record.subjectId,
                      );

                      return (
                        <div className="history-detail-record" key={record.id}>
                          <div>
                            <strong>
                              {subject?.name || "Unknown Subject"}
                            </strong>
                            <span>
                              {record.hour}
                              {record.hour === 1
                                ? "st"
                                : record.hour === 2
                                  ? "nd"
                                  : record.hour === 3
                                    ? "rd"
                                    : "th"}{" "}
                              Hour
                            </span>
                          </div>

                          <span className={`history-status ${record.status}`}>
                            {record.status === "present"
                              ? "✓ Present"
                              : "✕ Absent"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
        )}

        {activePage === "analytics" && (
          <section className="analytics-page">
            <section className="analytics-page-header">
              <div>
                <p className="eyebrow">ATTENDANCE INSIGHTS</p>
                <h2>Analytics</h2>
                <span>Understand your attendance performance at a glance.</span>
              </div>

              <div className={`analytics-overall-status ${overallStatus.type}`}>
                <span>Overall Status</span>
                <strong>{overallStatus.label}</strong>
              </div>
            </section>

            <section className="analytics-overview-grid">
              <div className="analytics-stat-card primary">
                <span className="analytics-stat-label">Overall Attendance</span>
                <strong>{overallPercentage}%</strong>
                <small>
                  {overallPresent} present · {overallAbsent} absent
                </small>
              </div>

              <div className="analytics-stat-card">
                <span className="analytics-stat-label">Total Classes</span>
                <strong>{analyticsTotalClasses}</strong>
                <small>Attendance records</small>
              </div>

              <div className="analytics-stat-card">
                <span className="analytics-stat-label">85% Target</span>
                <strong>
                  {analyticsTargetGap === 0 ? "✓" : `${analyticsTargetGap}%`}
                </strong>
                <small>
                  {analyticsTargetGap === 0
                    ? "Target achieved"
                    : "Gap to target"}
                </small>
              </div>

              <div className="analytics-stat-card">
                <span className="analytics-stat-label">90% Goal</span>
                <strong>
                  {analyticsMaxGoalGap === 0 ? "✓" : `${analyticsMaxGoalGap}%`}
                </strong>
                <small>
                  {analyticsMaxGoalGap === 0
                    ? "Maximum goal reached"
                    : "Gap to goal"}
                </small>
              </div>
            </section>

            <section className="analytics-main-grid">
              <div className="analytics-panel analytics-subject-panel">
                <div className="section-heading">
                  <div>
                    <p>SUBJECT PERFORMANCE</p>
                    <h2>Attendance by Subject</h2>
                  </div>
                </div>

                <div className="analytics-subject-list">
                  {analyticsSubjectRanking.map((subject) => {
                    const status = getAttendanceStatus(subject.percentage);
                    const barWidth = Math.min(subject.percentage, 100);

                    return (
                      <div className="analytics-subject-row" key={subject.id}>
                        <div className="analytics-subject-info">
                          <div>
                            <strong>{subject.name}</strong>
                            <span>
                              {subject.present}P · {subject.absent}A
                            </span>
                          </div>
                          <strong>{subject.percentage}%</strong>
                        </div>

                        <div className="analytics-bar-track">
                          <div
                            className={`analytics-bar-fill ${status.type}`}
                            style={{ width: `${barWidth}%` }}
                          />
                          <span
                            className="analytics-target-line"
                            style={{
                              left: `${authenticatedUser.target_attendance || 85}%`,
                            }}
                          />
                        </div>

                        <div className="analytics-subject-meta">
                          <span className={`status ${status.type}`}>
                            {status.label}
                          </span>
                          {subject.percentage <
                            (authenticatedUser.target_attendance || 85) && (
                            <small>
                              +
                              {getClassesNeeded(
                                subject.present,
                                subject.absent,
                                authenticatedUser.target_attendance || 85,
                              )}{" "}
                              classes needed
                            </small>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {subjectAttendance.length === 0 && (
                    <div className="analytics-empty">
                      No subject data available yet.
                    </div>
                  )}
                </div>

                <div className="analytics-target-legend">
                  <span>
                    <i className="analytics-target-marker" /> 85% Target
                  </span>
                  <span>
                    <i className="analytics-goal-marker" /> 90% Goal
                  </span>
                </div>
              </div>

              <div className="analytics-panel analytics-summary-panel">
                <div className="section-heading">
                  <div>
                    <p>STATUS BREAKDOWN</p>
                    <h2>Performance Summary</h2>
                  </div>
                </div>

                <div className="analytics-status-list">
                  <div>
                    <span>
                      <i className="analytics-status-dot excellent" /> Excellent
                    </span>
                    <strong>{excellentCount}</strong>
                  </div>
                  <div>
                    <span>
                      <i className="analytics-status-dot target" /> On Target
                    </span>
                    <strong>{targetCount}</strong>
                  </div>
                  <div>
                    <span>
                      <i className="analytics-status-dot warning" /> Needs
                      Attention
                    </span>
                    <strong>{warningCount}</strong>
                  </div>
                  <div>
                    <span>
                      <i className="analytics-status-dot critical" /> Critical
                    </span>
                    <strong>{criticalCount}</strong>
                  </div>
                </div>

                {analyticsBestSubject && (
                  <div className="analytics-highlight best">
                    <span>🏆 Best Performing Subject</span>
                    <strong>{analyticsBestSubject.shortName}</strong>
                    <small>{analyticsBestSubject.percentage}% attendance</small>
                  </div>
                )}

                {analyticsNeedsAttention.length > 0 ? (
                  <div className="analytics-highlight attention">
                    <span>⚠ Needs Attention</span>
                    <strong>
                      {analyticsNeedsAttention.length} subject
                      {analyticsNeedsAttention.length > 1 ? "s" : ""}
                    </strong>
                    <small>
                      Below your {authenticatedUser.target_attendance || 85}%
                      target
                    </small>
                  </div>
                ) : (
                  <div className="analytics-highlight success">
                    <span>✓ Great Work</span>
                    <strong>All subjects on target</strong>
                    <small>
                      You are maintaining at least{" "}
                      {authenticatedUser.target_attendance || 85}%.
                    </small>
                  </div>
                )}
              </div>
            </section>

            <section className="analytics-goal-panel">
              <div>
                <p>ATTENDANCE GOAL</p>
                <h2>Stay above {authenticatedUser.target_attendance || 85}%</h2>
                <span>
                  Keep attending classes consistently to protect your
                  attendance.
                </span>
              </div>

              <div className="analytics-goal-progress">
                <div className="analytics-goal-values">
                  <strong>{overallPercentage}%</strong>
                  <span>
                    {authenticatedUser.target_attendance || 85}% target
                  </span>
                </div>
                <div className="analytics-goal-track">
                  <div
                    style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                  />
                  <span
                    style={{
                      left: `${authenticatedUser.target_attendance || 85}%`,
                    }}
                  />
                </div>
              </div>
            </section>
          </section>
        )}

        {activePage === "calendar" && (
          <section className="calendar-page">
            <div className="section-heading">
              <div>
                <p>ATTENDANCE CALENDAR</p>
                <h2>Calendar</h2>
              </div>
            </div>

            <div className="calendar-placeholder">
              <div className="calendar-header">
                <button
                  className="calendar-nav-button"
                  disabled={calendarDate <= semesterStartMonth}
                  onClick={() => {
                    setSelectedCalendarDate(null);

                    setCalendarDate(
                      new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth() - 1,
                        1,
                      ),
                    );
                  }}
                >
                  ←
                </button>

                <h3>
                  {calendarDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>

                <button className="calendar-today-button" onClick={goToToday}>
                  Today
                </button>

                <select
                  className="calendar-subject-filter"
                  value={calendarSubjectFilter}
                  onChange={(event) =>
                    setCalendarSubjectFilter(event.target.value)
                  }
                >
                  <option value="all">All Subjects</option>

                  {userSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>

                <button
                  className="calendar-nav-button"
                  disabled={calendarDate >= semesterEndMonth}
                  onClick={() => {
                    setSelectedCalendarDate(null);

                    setCalendarDate(
                      new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth() + 1,
                        1,
                      ),
                    );
                  }}
                >
                  →
                </button>
              </div>

              <p className="calendar-info">
                Select a month to view your attendance.
              </p>
              <div className="calendar-weekdays">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div key={day}>{day}</div>
                  ),
                )}
              </div>
              <div className="calendar-grid">
                {Array.from(
                  {
                    length: new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth(),
                      1,
                    ).getDay(),
                  },
                  (_, index) => (
                    <div
                      className="calendar-day calendar-empty-cell"
                      key={`empty-${index}`}
                    />
                  ),
                )}

                {Array.from(
                  {
                    length: new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() + 1,
                      0,
                    ).getDate(),
                  },
                  (_, index) => {
                    const day = index + 1;

                    const dateString = `${calendarDate.getFullYear()}-${String(
                      calendarDate.getMonth() + 1,
                    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                    const dayRecords = userAttendanceRecords.filter(
                      (record) => record.date === dateString,
                    );

                    const hasPresent = dayRecords.some(
                      (record) => record.status === "present",
                    );

                    const hasAbsent = dayRecords.some(
                      (record) => record.status === "absent",
                    );

                    const isCollegeLeave = userCollegeLeaves.some(
                      (leave) => leave.date === dateString,
                    );

                    const semesterStart = new Date(
                      authenticatedUser?.semester_start || "2026-08-10",
                    );
                    const semesterEnd = new Date(
                      authenticatedUser?.semester_end || "2026-12-18",
                    );
                    const currentDate = new Date(dateString);

                    const isWithinSemester =
                      currentDate >= semesterStart &&
                      currentDate <= semesterEnd;
                    const isToday =
                      currentDate.toDateString() === new Date().toDateString();

                    return (
                      <div
                        className={`calendar-day ${
                          hasPresent ? "has-present" : ""
                        } ${hasAbsent ? "has-absent" : ""} ${
                          !isWithinSemester ? "outside-semester" : ""
                        } ${isCollegeLeave ? "college-leave" : ""} ${isToday ? "today" : ""} ${selectedCalendarDate === dateString ? "selected" : ""}`}
                        key={day}
                        onClick={() => {
                          if (isWithinSemester) {
                            setSelectedCalendarDate(dateString);
                          }
                        }}
                      >
                        <span>{day}</span>

                        <div className="calendar-status">
                          {hasPresent && (
                            <span className="calendar-dot present-dot">P</span>
                          )}

                          {hasAbsent && (
                            <span className="calendar-dot absent-dot">A</span>
                          )}

                          {isCollegeLeave && (
                            <span className="calendar-dot leave-dot">L</span>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
                <div className="calendar-legend">
                  <div>
                    <span className="legend-dot present"></span>
                    <span>Present</span>
                  </div>

                  <div>
                    <span className="legend-dot absent"></span>
                    <span>Absent</span>
                  </div>

                  <div>
                    <span className="calendar-dot leave-dot">L</span>
                    <span>College Leave</span>
                  </div>
                </div>

                {selectedCalendarDate && (
                  <div className="calendar-date-details">
                    <div className="calendar-date-details-header">
                      <div>
                        <p>SELECTED DATE</p>
                        <h3>
                          {new Date(
                            `${selectedCalendarDate}T00:00:00`,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </h3>
                      </div>

                      <button
                        className="calendar-close-button"
                        onClick={() => setSelectedCalendarDate(null)}
                      >
                        ✕
                      </button>
                    </div>

                    {(() => {
                      const selectedDateLeave = userCollegeLeaves.find(
                        (leave) => leave.date === selectedCalendarDate,
                      );

                      const selectedDateHasAttendance =
                        selectedDateRecords.length > 0;

                      return (
                        <div className="calendar-leave-action">
                          {selectedDateLeave ? (
                            <div className="calendar-leave-status">
                              <span className="calendar-leave-icon">🏖️</span>
                              <div>
                                <strong>College Leave</strong>
                                <span>
                                  No attendance is required for this date.
                                </span>
                              </div>

                              <button
                                className="calendar-remove-leave-button"
                                onClick={() =>
                                  removeCollegeLeave(selectedCalendarDate)
                                }
                              >
                                Remove Leave
                              </button>
                            </div>
                          ) : selectedDateHasAttendance ? null : (
                            <button
                              className="calendar-mark-leave-button"
                              onClick={() => {
                                markCollegeLeave(selectedCalendarDate);
                                setErrorMessage("");
                              }}
                            >
                              <span>🏖️</span>
                              <div>
                                <strong>Mark as College Leave</strong>
                                <small>
                                  Attendance won't be counted for this day
                                </small>
                              </div>
                              <span className="calendar-leave-arrow">→</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {userCollegeLeaves.some(
                      (leave) => leave.date === selectedCalendarDate,
                    ) ? (
                      <div className="calendar-leave-details">
                        <div className="calendar-leave-details-icon">🏖️</div>
                        <div>
                          <h3>College Leave</h3>
                          <p>
                            This is a college holiday. No attendance is required
                            and this date does not affect your attendance
                            percentage.
                          </p>
                        </div>
                      </div>
                    ) : calendarSubjects.length > 0 ? (
                      <>
                        <div className="calendar-day-summary">
                          <div>
                            <strong>{calendarSubjects.length}</strong>
                            <span>
                              {calendarSubjects.length === 1
                                ? "Subject"
                                : "Subjects"}
                            </span>
                          </div>

                          <div>
                            <strong>{selectedDateHourCount}</strong>
                            <span>
                              {selectedDateHourCount === 1 ? "Hour" : "Hours"}
                            </span>
                          </div>

                          <div>
                            <strong>{selectedDatePresentCount}</strong>
                            <span>Present</span>
                          </div>

                          <div>
                            <strong>{selectedDateAbsentCount}</strong>
                            <span>Absent</span>
                          </div>
                        </div>

                        <div className="calendar-date-records">
                          {calendarSubjects.map((subject) => (
                            <div
                              className="calendar-date-record"
                              key={subject.id}
                            >
                              <div>
                                <strong>{subject.name}</strong>
                                <span>{subject.shortName}</span>
                              </div>

                              <div className="calendar-subject-actions">
                                <div className="calendar-hour-records">
                                  {subject.records.map((record) => (
                                    <div
                                      className="calendar-hour-record"
                                      key={record.id}
                                    >
                                      <span className="calendar-hour-label">
                                        {record.hour}
                                        {record.hour === 1
                                          ? "st"
                                          : record.hour === 2
                                            ? "nd"
                                            : record.hour === 3
                                              ? "rd"
                                              : "th"}{" "}
                                        Hour
                                      </span>

                                      <span
                                        className={`calendar-record-status ${record.status}`}
                                      >
                                        {record.status === "present"
                                          ? "✓ Present"
                                          : "✕ Absent"}
                                      </span>

                                      <div className="history-actions">
                                        <button
                                          className="edit-record"
                                          title="Edit attendance"
                                          onClick={() => editAttendance(record)}
                                        >
                                          ✏
                                        </button>
                                        <button
                                          className="delete-record"
                                          title="Delete attendance"
                                          onClick={() =>
                                            setDeleteRecord(record)
                                          }
                                        >
                                          🗑
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="calendar-empty-date">
                        <div className="calendar-empty-date-icon">📅</div>
                        <h3>No attendance marked</h3>
                        <p>
                          No attendance has been recorded for this date yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activePage === "settings" && (
          <section className="settings-page">
            <div className="section-heading">
              <div>
                <p>ACCOUNT SETTINGS</p>
                <h2>Settings</h2>
                <span>Manage your Attendix profile and account.</span>
              </div>
            </div>

            {errorMessage && (
              <div className="entry-error">
                <span className="entry-error-icon">!</span>
                <div>
                  <strong>Unable to update profile</strong>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="entry-success">
                <span className="entry-success-icon">✓</span>
                <div>
                  <strong>Success</strong>
                  <p>{successMessage}</p>
                </div>
              </div>
            )}

            <div className="settings-profile-card">
              <div className="settings-profile-avatar">
                {authenticatedUser.name.charAt(0).toUpperCase()}
              </div>

              <div className="settings-profile-info">
                <p>PROFILE</p>
                <h3>{authenticatedUser.name}</h3>
                <span>{authenticatedUser.email}</span>
                {editingProfile && (
                  <div className="settings-edit-form">
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your name"
                    />

                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="Your email"
                    />

                    <div className="settings-edit-actions">
                      <button onClick={saveProfile} disabled={profileSaving}>
                        {profileSaving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={cancelProfileEdit}>Cancel</button>
                    </div>
                  </div>
                )}
                <button
                  className="settings-edit-button"
                  onClick={startProfileEdit}
                >
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="settings-academic-card">
              <div className="settings-academic-heading">
                <p>ACADEMIC INFORMATION</p>
                <h3>Academic Details</h3>
              </div>

              <div className="settings-academic-grid">
                <div>
                  <span>College</span>
                  <strong>{authenticatedUser.college || "Not set"}</strong>
                </div>

                <div>
                  <span>Semester</span>
                  <strong>{authenticatedUser.semester || "Not set"}</strong>
                </div>

                <div>
                  <span>Semester Start</span>
                  <strong>
                    {authenticatedUser.semester_start || "Not set"}
                  </strong>
                </div>

                <div>
                  <span>Semester End</span>
                  <strong>{authenticatedUser.semester_end || "Not set"}</strong>
                </div>
              </div>

              <button
                className="settings-edit-button"
                onClick={() => {
                  setAcademicCollege(authenticatedUser.college || "");
                  setAcademicSemester(authenticatedUser.semester || "");
                  setAcademicStart(authenticatedUser.semester_start || "");
                  setAcademicEnd(authenticatedUser.semester_end || "");
                  setEditingAcademic(true);
                }}
              >
                Edit Academic Details
              </button>

              {editingAcademic && (
                <div className="settings-edit-form">
                  <input
                    type="text"
                    value={academicCollege}
                    onChange={(e) => setAcademicCollege(e.target.value)}
                    placeholder="College name"
                  />

                  <input
                    type="text"
                    value={academicSemester}
                    onChange={(e) => setAcademicSemester(e.target.value)}
                    placeholder="Semester"
                  />

                  <input
                    type="date"
                    value={academicStart}
                    onChange={(e) => setAcademicStart(e.target.value)}
                  />

                  <input
                    type="date"
                    value={academicEnd}
                    onChange={(e) => setAcademicEnd(e.target.value)}
                  />

                  <div className="settings-edit-actions">
                    <button
                      onClick={async () => {
                        setErrorMessage("");
                        setSuccessMessage("");

                        if (
                          !academicCollege.trim() ||
                          !academicSemester.trim() ||
                          !academicStart ||
                          !academicEnd
                        ) {
                          setErrorMessage("All academic fields are required.");
                          return;
                        }

                        if (academicStart > academicEnd) {
                          setErrorMessage(
                            "Semester start date cannot be after the end date.",
                          );
                          return;
                        }

                        try {
                          setAcademicSaving(true);

                          const response = await updateCurrentUser(
                            authenticatedUser.name,
                            authenticatedUser.email,
                            academicCollege.trim(),
                            academicSemester.trim(),
                            academicStart,
                            academicEnd,
                            authenticatedUser.target_attendance || 85,
                            authenticatedUser.maximum_attendance || 90,
                          );

                          if (response.user) {
                            setAuthenticatedUser(response.user);
                            localStorage.setItem(
                              "attendix_user",
                              JSON.stringify(response.user),
                            );
                          }

                          setEditingAcademic(false);
                          setSuccessMessage(
                            "Academic information updated successfully.",
                          );
                        } catch (error) {
                          console.error("Academic update error:", error);
                          setErrorMessage(
                            error.message ||
                              "Unable to update academic information.",
                          );
                        } finally {
                          setAcademicSaving(false);
                        }
                      }}
                      disabled={academicSaving}
                    >
                      {academicSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAcademic(false);
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-academic-card">
              <div className="settings-academic-heading">
                <p>ATTENDANCE</p>
                <h3>Attendance Goals</h3>
              </div>

              <div className="settings-academic-grid">
                <div>
                  <span>Target Attendance</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={targetAttendance}
                    onChange={(e) => {
                      const value = Math.min(
                        100,
                        Math.max(
                          1,
                          Math.min(
                            Number(e.target.value),
                            Number(maximumAttendance),
                          ),
                        ),
                      );
                      setTargetAttendance(value);
                    }}
                  />
                </div>

                <div>
                  <span>Maximum Goal</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maximumAttendance}
                    onChange={(e) => {
                      const value = Math.min(
                        100,
                        Math.max(
                          Number(targetAttendance),
                          Number(e.target.value),
                        ),
                      );
                      setMaximumAttendance(value);
                    }}
                  />
                </div>
              </div>

              <div className="settings-edit-actions">
                <button onClick={saveAttendanceGoals} disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </section>
        )}

        {showLogoutModal && (
          <div className="delete-modal-overlay">
            <div className="delete-modal logout-confirm-modal">
              <div className="delete-modal-icon logout-modal-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </div>

              <h3>Logout from Attendix?</h3>

              <p>Are you sure you want to logout from your account?</p>

              <div className="delete-modal-actions">
                <button
                  className="delete-cancel"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>

                <button className="delete-confirm" onClick={handleLogout}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>

                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteSubject && (
          <div className="delete-modal-overlay">
            <div className="delete-modal">
              <div className="delete-modal-icon">🗑</div>

              <h3>Delete Subject?</h3>

              <p>
                Delete <strong>{deleteSubject.name}</strong>? All attendance
                records for this subject will also be removed.
              </p>

              <div className="delete-modal-actions">
                <button
                  className="delete-cancel"
                  onClick={() => setDeleteSubject(null)}
                >
                  Cancel
                </button>

                <button
                  className="delete-confirm"
                  onClick={() => deleteSubjectAndRecords(deleteSubject)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteRecord && (
          <div className="delete-modal-overlay">
            <div className="delete-modal">
              <div className="delete-modal-icon">🗑</div>

              <h3>Delete Attendance?</h3>

              <p>
                Are you sure you want to delete this attendance record? This
                action cannot be undone.
              </p>

              <div className="delete-modal-actions">
                <button
                  className="delete-cancel"
                  onClick={() => setDeleteRecord(null)}
                >
                  Cancel
                </button>

                <button
                  className="delete-confirm"
                  onClick={() => {
                    deleteAttendance(deleteRecord);
                    setDeleteRecord(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
