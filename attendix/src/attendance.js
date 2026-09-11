export function getAttendancePercentage(present, absent) {
  const total = present + absent;

  if (total === 0) {
    return 0;
  }

  return Math.round((present / total) * 100);
}

export function getAttendanceStatus(percentage) {
  if (percentage >= 90) {
    return {
      label: "Excellent",
      type: "excellent",
    };
  }

  if (percentage >= 85) {
    return {
      label: "On Target",
      type: "target",
    };
  }

  if (percentage >= 75) {
    return {
      label: "Needs Attention",
      type: "warning",
    };
  }

  return {
    label: "Critical Attendance",
    type: "critical",
  };
}

function normalizeAttendanceValue(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.floor(number);
}

export function getClassesNeeded(present, absent, target = 85) {
  const total = present + absent;

  if (total === 0) {
    return 0;
  }

  if ((present / total) * 100 >= target) {
    return 0;
  }

  let classes = 0;

  while (((present + classes) / (total + classes)) * 100 < target) {
    classes++;
  }

  return classes;
}

export function getClassesNeededForGoal(present, absent, goal = 90) {
  return getClassesNeeded(present, absent, goal);
}

export function getClassesCanMiss(present, absent, target = 85) {
  const safePresent = normalizeAttendanceValue(present);
  const safeAbsent = normalizeAttendanceValue(absent);

  if (safePresent + safeAbsent === 0) {
    return 0;
  }

  let classes = 0;

  while (
    (safePresent / (safePresent + safeAbsent + classes + 1)) * 100 >=
    target
  ) {
    classes++;
  }

  return classes;
}

export function getAttendancePrediction(present, absent, upcomingClasses = 0) {
  const safePresent = normalizeAttendanceValue(present);
  const safeAbsent = normalizeAttendanceValue(absent);
  const safeUpcoming = normalizeAttendanceValue(upcomingClasses);

  const total = safePresent + safeAbsent;

  if (total === 0) {
    return 0;
  }

  return Math.round(
    ((safePresent + safeUpcoming) / (total + safeUpcoming)) * 100,
  );
}

export function getMaximumPossibleAttendance(present, absent) {
  const total = present + absent;

  if (total === 0) {
    return 0;
  }

  return Math.round((present / total) * 100);
}
