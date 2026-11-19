const STORAGE_KEY = "studenthub_tasks_v1";
const SETTINGS_KEY = "studenthub_settings_v1";
let tasks = loadTasks();
let currentFilter = "all";

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(dateString) {
  if (!dateString) return "No due date";
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function updateDate() {
  const now = new Date();
  document.getElementById("today-date").textContent =
    now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function updateDashboard() {
  const remaining = tasks.filter(task => !task.completed).length;
  const completed = tasks.filter(task => task.completed).length;

  // ===== PERSONALISED TASK REMINDER =====

  const settings = JSON.parse(
    localStorage.getItem(SETTINGS_KEY) || "{}"
  );

  const studentName = settings.studentName || "";
  const reminder = document.getElementById("personal-reminder");

  reminder.textContent = remaining === 0
    ? `Amazing${studentName ? ", " + studentName : ""}! You've completed all your tasks.`
    : `${studentName ? studentName + ", you have" : "You have"} ${remaining} task${remaining === 1 ? "" : "s"} left to complete.`;

  document.getElementById("remaining-count").textContent = remaining;
  document.getElementById("completed-count").textContent = completed;
  document.getElementById("total-count").textContent = tasks.length;
    // ===== STUDY ANALYTICS =====

  const analyticsTotal = tasks.length;
  const analyticsCompleted = tasks.filter(task => task.completed).length;

  const analyticsCompletion = analyticsTotal === 0
    ? 0
    : Math.round((analyticsCompleted / analyticsTotal) * 100);

  document.getElementById("analytics-completion").textContent =
    `${analyticsCompletion}%`;

  document.getElementById("analytics-total").textContent =
    analyticsTotal;

  document.getElementById("analytics-completed").textContent =
    analyticsCompleted;

  const subjectCountsForAnalytics = {};

  tasks.forEach(task => {
    const subject = (task.subject || "").trim() || "General";
    subjectCountsForAnalytics[subject] =
      (subjectCountsForAnalytics[subject] || 0) + 1;
  });

  const mostDemandingSubject = Object.entries(subjectCountsForAnalytics)
    .sort((a, b) => b[1] - a[1])[0];

  document.getElementById("analytics-subject").textContent =
    mostDemandingSubject ? mostDemandingSubject[0] : "—";
    // ===== SUBJECT BREAKDOWN =====

  const subjectCounts = {};

  tasks.forEach(task => {
    const subject = (task.subject || "").trim() || "General";
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
  });

  const subjectList = document.getElementById("subject-breakdown-list");

  const sortedSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1]);

  if (sortedSubjects.length === 0) {
    subjectList.innerHTML =
      '<p class="empty-state">Add tasks to see your subjects here.</p>';
  } else {
    subjectList.innerHTML = sortedSubjects.map(([subject, count]) => {
      const percentage = Math.round((count / tasks.length) * 100);

      return `
        <div class="subject-breakdown-item">
          <div class="subject-breakdown-heading">
            <strong>${escapeHTML(subject)}</strong>
            <span>${count} task${count === 1 ? "" : "s"}</span>
          </div>
          <div class="subject-breakdown-track">
            <div class="subject-breakdown-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }).join("");
  }
  const total = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;

  const percentage = total === 0
  ? 0
  : Math.round((completedTasks / total) * 100);

  document.getElementById("completion-percentage").textContent = `${percentage}%`;
  document.getElementById("completion-bar").style.width = `${percentage}%`;

  document.getElementById("progress-message").textContent =
  total === 0 ? "Let's get started!" :
  percentage === 100 ? "Amazing! All tasks completed!" :
  percentage >= 50 ? "Great progress. Keep going!" :
  "Every completed task counts!";

  const upcoming = tasks
    .filter(task => !task.completed)
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 4);
  const list = document.getElementById("upcoming-list");
  if (!upcoming.length) {
    list.innerHTML = '<p class="empty-state">No tasks yet. Add your first task to get started.</p>';
    return;
  }
  list.innerHTML = upcoming.map(task => `
    <div class="upcoming-item">
      <div>${escapeHTML(task.title)}<small>${escapeHTML(task.subject || "General")}</small></div>
      <span class="due-label">${escapeHTML(formatDate(task.due))}</span>
    </div>`).join("");
}

function renderTasks() {
  const searchInput = document.getElementById("task-search");
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filtered = tasks.filter(task => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm) ||
      (task.subject || "").toLowerCase().includes(searchTerm);

    return matchesFilter && matchesSearch;
  });
  const list = document.getElementById("task-list");
  document.getElementById("task-summary").textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
  if (!filtered.length) {
    const message = currentFilter === "completed" ? "No completed tasks yet." :
      currentFilter === "active" ? "You're all caught up." : "Add a task above and it will appear here.";
    list.innerHTML = `<div class="empty-card"><span>✦</span><h3>${currentFilter === "active" ? "Nothing pending." : "Your list is clear."}</h3><p>${message}</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(task => `
    <article class="task-item ${task.completed ? "done" : ""}">
      <input class="task-check" type="checkbox" data-action="toggle" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="Mark ${escapeHTML(task.title)} as completed">
      <div class="task-details">
        <div class="task-name">${escapeHTML(task.title)}</div>
        <div class="task-meta">
  <span class="subject-tag subject-${getSubjectColor(task.subject)}">
    ${escapeHTML(task.subject || "General")}
  </span>
  · ${escapeHTML(formatDate(task.due))}
</div>
<span class="task-priority priority-${task.priority || "medium"}">
  ${escapeHTML(task.priority || "medium")} priority
</span>
      </div>
      <button class="delete-task" data-action="delete" data-id="${task.id}" aria-label="Delete task">×</button>
    </article>`).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function refresh() {
  saveTasks();
  renderTasks();
  updateDashboard();
  renderCalendar();
}

document.getElementById("task-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get("title") || "").trim();
  if (!title) return;
  tasks.push({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title,
  subject: String(form.get("subject") || "").trim(),
  due: String(form.get("due") || ""),
  priority: String(form.get("priority") || "medium"),
  completed: false
});
  event.currentTarget.reset();
  refresh();
});

document.getElementById("task-list").addEventListener("click", event => {
  const button = event.target.closest("button[data-action='delete']");
  if (!button) return;
  tasks = tasks.filter(task => task.id !== button.dataset.id);
  refresh();
});

document.getElementById("task-list").addEventListener("change", event => {
  if (!event.target.matches("input[data-action='toggle']")) return;
  const task = tasks.find(item => item.id === event.target.dataset.id);
  if (task) task.completed = event.target.checked;
  refresh();
});

document.querySelectorAll(".filter-tab").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.toggle("active", tab === button));
    renderTasks();
  });
});

const searchInput = document.getElementById("task-search");

searchInput.addEventListener("input", () => {
  renderTasks();
});

function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `${name}-view`));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === name));
document.getElementById("page-title").textContent =
  name === "dashboard" ? "Dashboard" :
  name === "tasks" ? "My tasks" :
  name === "calendar" ? "Calendar" :
  name === "schedule" ? "Schedule" :
  name === "settings" ? "Settings" : "Dashboard";
}

document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));

updateDate();

function getSubjectColor(subject) {
  const name = (subject || "General").toLowerCase();

  if (name.includes("math")) return "blue";
  if (name.includes("english")) return "purple";
  if (name.includes("german") || name.includes("deutsch")) return "orange";
  if (name.includes("science") || name.includes("biology") || name.includes("chemistry") || name.includes("physics")) return "green";
  if (name.includes("history")) return "red";

  return "grey";
}


// ===================================
// STUDENTHUB - CUSTOM TIMETABLE
// ===================================

const TIMETABLE_KEY = "studenthub_timetable_v1";

const timetableDays = {
  letter: ["A", "B", "C", "D", "E", "F", "G", "H"],
  week: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
};

let timetableLessons = JSON.parse(
  localStorage.getItem(TIMETABLE_KEY) || "[]"
);

let editingLessonId = null;

const timetableMode = document.getElementById("timetable-mode");
const lessonDay = document.getElementById("lesson-day");
const lessonPeriod = document.getElementById("lesson-period");
const lessonSubject = document.getElementById("lesson-subject");
const lessonRoom = document.getElementById("lesson-room");
const addLessonButton = document.getElementById("add-lesson-btn");
const timetableGrid = document.getElementById("timetable-grid");

// Load the saved timetable system
const savedMode = localStorage.getItem("studenthub_timetable_mode") || "letter";
timetableMode.value = savedMode;

// Update the day options
function updateLessonDays() {
  const days = timetableDays[timetableMode.value];

  lessonDay.innerHTML = '<option value="">Choose a day</option>';

  days.forEach(day => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = timetableMode.value === "letter"
      ? `Day ${day}`
      : day;

    lessonDay.appendChild(option);
  });
}

// Save lessons
function saveTimetable() {
  localStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetableLessons));
}

// Display the timetable
function renderTimetable() {
  const days = timetableDays[timetableMode.value];

  timetableGrid.innerHTML = "";

  days.forEach(day => {
    const dayLessons = timetableLessons
      .filter(lesson => lesson.day === day)
      .sort((a, b) => a.period - b.period);

    const dayCard = document.createElement("div");
    dayCard.className = "timetable-day-card";

    let lessonHTML = "";

    if (dayLessons.length === 0) {
      lessonHTML = '<p class="muted">No lessons added yet.</p>';
    } else {
      lessonHTML = dayLessons.map(lesson => `
        <div class="timetable-lesson">
          <div>
            <strong>Period ${lesson.period}: ${escapeHTML(lesson.subject)}</strong>
            <p>${lesson.room ? `Room ${escapeHTML(lesson.room)}` : "No room added"}</p>
          </div>
<div class="lesson-actions">
  <button type="button" class="edit-lesson" data-edit-lesson="${lesson.id}">
    Edit
  </button>
  <button type="button" class="delete-lesson" data-delete-lesson="${lesson.id}">
    Delete
  </button>
</div>
        </div>
      `).join("");
    }

    dayCard.innerHTML = `
      <h3>${timetableMode.value === "letter" ? `Day ${day}` : day}</h3>
      ${lessonHTML}
    `;

    timetableGrid.appendChild(dayCard);
  });
}

// Add or edit a lesson
addLessonButton.addEventListener("click", () => {
  const day = lessonDay.value;
  const period = Number(lessonPeriod.value);
  const subject = lessonSubject.value.trim();
  const room = lessonRoom.value.trim();

  if (!day || !subject || !Number.isInteger(period) || period < 1 || period > 8) {
    alert("Please choose a day, enter a subject and enter a period between 1 and 8.");
    return;
  }

  const duplicate = timetableLessons.find(lesson =>
    lesson.day === day &&
    lesson.period === period &&
    lesson.id !== editingLessonId
  );

  if (duplicate) {
    alert("You already have a lesson in this period!");
    return;
  }

  if (editingLessonId) {
    const lesson = timetableLessons.find(
      item => item.id === editingLessonId
    );

    if (lesson) {
      lesson.day = day;
      lesson.period = period;
      lesson.subject = subject;
      lesson.room = room;
    }

    editingLessonId = null;
    addLessonButton.textContent = "Add lesson";
  } else {
    timetableLessons.push({
      id: Date.now().toString(),
      day,
      period,
      subject,
      room
    });
  }

  saveTimetable();
  renderTimetable();

  lessonPeriod.value = "";
  lessonSubject.value = "";
  lessonRoom.value = "";
});

// Delete a lesson
// Edit and delete lessons
timetableGrid.addEventListener("click", event => {

  const editButton = event.target.closest("[data-edit-lesson]");

  if (editButton) {
    const lesson = timetableLessons.find(
      item => item.id === editButton.dataset.editLesson
    );

    if (!lesson) return;

    lessonDay.value = lesson.day;
    lessonPeriod.value = lesson.period;
    lessonSubject.value = lesson.subject;
    lessonRoom.value = lesson.room;

    editingLessonId = lesson.id;
    addLessonButton.textContent = "Save changes";

    lessonSubject.focus();
    return;
  }

  const deleteButton = event.target.closest("[data-delete-lesson]");

  if (!deleteButton) return;

  const lessonId = deleteButton.dataset.deleteLesson;

  timetableLessons = timetableLessons.filter(
    lesson => lesson.id !== lessonId
  );

  if (editingLessonId === lessonId) {
    editingLessonId = null;
    addLessonButton.textContent = "Add lesson";
    lessonPeriod.value = "";
    lessonSubject.value = "";
    lessonRoom.value = "";
  }

  saveTimetable();
  renderTimetable();
});
// Switch between timetable systems
timetableMode.addEventListener("change", () => {
  localStorage.setItem("studenthub_timetable_mode", timetableMode.value);
  updateLessonDays();
  renderTimetable();
});

// Start the timetable
updateLessonDays();
renderTimetable();


// ===== CALENDAR =====

let calendarDate = new Date();
let selectedCalendarDate = formatCalendarDate(new Date());

const calendarGrid = document.getElementById("calendar-grid");
const calendarMonth = document.getElementById("calendar-month");
const selectedDateTitle = document.getElementById("selected-date-title");
const selectedDateTasks = document.getElementById("selected-date-tasks");
const upcomingDeadlines = document.getElementById("upcoming-deadlines");

function formatCalendarDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarMonth.textContent = calendarDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  });

  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const startingPosition = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = formatCalendarDate(new Date());

  for (let i = 0; i < startingPosition; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = formatCalendarDate(new Date(year, month, day));
    const dayTasks = tasks.filter(task => task.due === date);

    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "calendar-day";

    if (date === today) dayButton.classList.add("today");
    if (date === selectedCalendarDate) dayButton.classList.add("selected");

    dayButton.innerHTML = `<span class="day-number">${day}</span>`;

    if (dayTasks.length > 0) {
      const dot = document.createElement("span");
      dot.className = "calendar-task-dot";
      dayButton.appendChild(dot);
    }

    dayButton.addEventListener("click", () => {
      selectedCalendarDate = date;
      renderCalendar();
      renderSelectedDateTasks();
    });

    calendarGrid.appendChild(dayButton);
  }

  renderSelectedDateTasks();
  renderUpcomingDeadlines();
}

function renderSelectedDateTasks() {
  const date = new Date(
    ...selectedCalendarDate.split("-").map(Number).map((value, index) =>
      index === 1 ? value - 1 : value
    )
  );

  selectedDateTitle.textContent = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  const dayTasks = tasks.filter(task => task.due === selectedCalendarDate);

  if (dayTasks.length === 0) {
    selectedDateTasks.innerHTML =
      '<p class="calendar-empty">No assignments due on this day.</p>';
    return;
  }

  selectedDateTasks.innerHTML = "";

  dayTasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "calendar-task-item";

    const title = document.createElement("strong");
    title.textContent = task.title;

    const details = document.createElement("p");
    details.textContent =
      `${task.subject || "No subject"} · ${task.completed ? "Completed" : "To do"}`;

    item.appendChild(title);
    item.appendChild(details);
    selectedDateTasks.appendChild(item);
  });
}

function renderUpcomingDeadlines() {
  upcomingDeadlines.innerHTML = "";

  const today = formatCalendarDate(new Date());

  const upcoming = tasks
    .filter(task => task.due && task.due >= today && !task.completed)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

if (upcoming.length === 0) {
  upcomingDeadlines.innerHTML =
    '<p class="calendar-empty">No upcoming deadlines. You\'re all clear!</p>';
  return;
}

  upcoming.forEach(task => {
    const item = document.createElement("div");
    item.className = "deadline-item";

    const title = document.createElement("strong");
    title.textContent = task.title;

    const date = document.createElement("p");
    date.textContent = new Date(
      ...task.due.split("-").map(Number).map((value, index) =>
        index === 1 ? value - 1 : value
      )
    ).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short"
    });

    item.appendChild(title);
    item.appendChild(date);
    upcomingDeadlines.appendChild(item);
  });
}

document.getElementById("prev-month").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("next-month").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

refresh();

// ===== DARK MODE =====

const themeToggle = document.getElementById("theme-toggle");

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  if (theme === "dark") {
    themeToggle.textContent = "☀️ Light mode";
    themeToggle.setAttribute("aria-label", "Switch to light mode");
  } else {
    themeToggle.textContent = "🌙 Dark mode";
    themeToggle.setAttribute("aria-label", "Switch to dark mode");
  }

  localStorage.setItem("studenthub_theme", theme);
}

const savedTheme = localStorage.getItem("studenthub_theme") || "light";

setTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const currentTheme =
    document.documentElement.getAttribute("data-theme");

  setTheme(currentTheme === "dark" ? "light" : "dark");
});


// ===== STUDENTHUB SETTINGS =====

const studentNameInput = document.getElementById("student-name");
const schoolNameInput = document.getElementById("school-name");
const saveSettingsButton = document.getElementById("save-settings");
const settingsMessage = document.getElementById("settings-message");

// Load saved settings
const savedSettings = JSON.parse(
  localStorage.getItem(SETTINGS_KEY) || "{}"
);

studentNameInput.value = savedSettings.studentName || "";
schoolNameInput.value = savedSettings.schoolName || "";

// Save settings
saveSettingsButton.addEventListener("click", () => {
  const settings = {
    studentName: studentNameInput.value.trim(),
    schoolName: schoolNameInput.value.trim()
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  settingsMessage.textContent = "Settings saved successfully!";
});


// ===== PERSONAL GREETING =====


function updateGreeting() {
  const settings = JSON.parse(
    localStorage.getItem(SETTINGS_KEY) || "{}"
  );

  const name = settings.studentName;
  const greeting = document.getElementById("welcome-heading");

  const hour = new Date().getHours();

  let timeGreeting;

  if (hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour < 18) {
    timeGreeting = "Good afternoon";
  } else {
    timeGreeting = "Good evening";
  }

  greeting.innerHTML = name
    ? `${timeGreeting}, ${escapeHTML(name)}!<br>Let's get started.`
    : "Make today<br>count.";
}

updateGreeting();

// Update greeting after saving settings
saveSettingsButton.addEventListener("click", updateGreeting);

// ===== QUICK NOTES =====

const NOTES_KEY = "studenthub_notes_v1";

let notes = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]").map(note => {
  if (typeof note === "string") {
    return {
      text: note,
      pinned: false
    };
  }

  return {
    text: note.text || "",
    pinned: Boolean(note.pinned)
  };
});

const noteInput = document.getElementById("note-input");
const addNoteButton = document.getElementById("add-note");
const notesList = document.getElementById("notes-list");

// Save notes
function saveNotes() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

// Display notes
function renderNotes() {
  notesList.innerHTML = "";

  if (notes.length === 0) {
    notesList.innerHTML =
      '<p class="empty-state">No notes yet. Add your first note!</p>';
    return;
  }

notes
  .map((note, index) => ({ note, index }))
  .sort((a, b) => Number(b.note.pinned) - Number(a.note.pinned))
  .forEach(({ note, index }) => {
    const noteCard = document.createElement("div");
    noteCard.className = "note-card";

    const noteText = document.createElement("p");
    noteText.textContent = note.text;
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "edit-note";

    editButton.addEventListener("click", () => {
      const updatedNote = prompt("Edit your note:", notes[index]);

      if (updatedNote === null) return;

      if (updatedNote.trim() === "") {
        alert("Your note cannot be empty.");
        return;
      }

notes[index].text = updatedNote.trim();
      saveNotes();
      renderNotes();
    });
    const pinButton = document.createElement("button");

pinButton.textContent = note.pinned ? "📌 Unpin" : "📌 Pin";
pinButton.className = "pin-note";

pinButton.addEventListener("click", () => {
  notes[index].pinned = !notes[index].pinned;
  saveNotes();
  renderNotes();
});
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-note";

    deleteButton.addEventListener("click", () => {
      notes.splice(index, 1);
      saveNotes();
      renderNotes();
    });

noteCard.appendChild(noteText);
noteCard.appendChild(pinButton);
noteCard.appendChild(editButton);
noteCard.appendChild(deleteButton);
    notesList.appendChild(noteCard);
  });
}

// Add a note
addNoteButton.addEventListener("click", () => {
  const note = noteInput.value.trim();

  if (note === "") return;

notes.push({
  text: note,
  pinned: false
});

  saveNotes();
  renderNotes();

  noteInput.value = "";
});

// Load notes when the page opens
renderNotes();

// ===== STUDY TIMER =====

// ===== STUDY TIMER =====

const TIMER_SETTINGS_KEY = "studenthub_timer_settings";
const TOTAL_STUDY_KEY = "studenthub_total_minutes";
const DAILY_STUDY_KEY = "studenthub_daily_study";
const DAILY_GOAL_KEY = "studenthub_daily_goal";

function getSavedNumber(key, fallback, min, max) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

let timerSettings = JSON.parse(
  localStorage.getItem(TIMER_SETTINGS_KEY) || '{"focus":25,"break":5}'
);

let focusMinutes = Math.min(180, Math.max(1, Number(timerSettings.focus) || 25));
let breakMinutes = Math.min(60, Math.max(1, Number(timerSettings.break) || 5));

let dailyGoal = getSavedNumber(DAILY_GOAL_KEY, 60, 1, 1440);
let totalStudyMinutes = getSavedNumber(TOTAL_STUDY_KEY, 0, 0, 10000000);

function getTodayKey() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
}

function loadDailyStudy() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(DAILY_STUDY_KEY) || "{}"
    );

    return saved.date === getTodayKey()
      ? Number(saved.minutes) || 0
      : 0;
  } catch {
    return 0;
  }
}

let dailyStudyMinutes = loadDailyStudy();

let timerDuration = focusMinutes * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let currentTimerMode = "focus";

let completedSessions =
  Number(localStorage.getItem("studenthub_sessions")) || 0;

const timerDisplay = document.getElementById("timer-display");
const timerMode = document.getElementById("timer-mode");
const timerStart = document.getElementById("timer-start");
const timerReset = document.getElementById("timer-reset");
const timerProgress = document.getElementById("timer-progress-bar");
const sessionCount = document.getElementById("session-count");

const focusDurationInput = document.getElementById("focus-duration");
const breakDurationInput = document.getElementById("break-duration");
const saveTimerSettingsButton = document.getElementById("save-timer-settings");

const totalStudyTimeDisplay = document.getElementById("total-study-time");
const dailyStudyGoalDisplay = document.getElementById("daily-study-goal");
const studyGoalProgressDisplay = document.getElementById("study-goal-progress");
const studyGoalBar = document.getElementById("study-goal-bar");

const dailyGoalInput = document.getElementById("daily-goal-input");
const saveStudyGoalButton = document.getElementById("save-study-goal");

// Load saved settings into the inputs
focusDurationInput.value = focusMinutes;
breakDurationInput.value = breakMinutes;
dailyGoalInput.value = dailyGoal;

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;

  timerDisplay.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress =
    ((timerDuration - timerRemaining) / timerDuration) * 100;

  timerProgress.style.width = `${progress}%`;
}

function updateStudyStats() {
  totalStudyTimeDisplay.textContent = `${totalStudyMinutes} min`;
  dailyStudyGoalDisplay.textContent = `${dailyGoal} min`;

  const percentage = Math.min(
    Math.round((dailyStudyMinutes / dailyGoal) * 100),
    100
  );

  studyGoalProgressDisplay.textContent = `${percentage}%`;
  studyGoalBar.style.width = `${percentage}%`;

  localStorage.setItem(TOTAL_STUDY_KEY, totalStudyMinutes);

  localStorage.setItem(
    DAILY_STUDY_KEY,
    JSON.stringify({
      date: getTodayKey(),
      minutes: dailyStudyMinutes
    })
  );
}

function updateSessionCount() {
  sessionCount.textContent = completedSessions;

  localStorage.setItem(
    "studenthub_sessions",
    completedSessions
  );
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerStart.textContent = "Start";
}

function switchTimerMode(mode) {
  stopTimer();

  currentTimerMode = mode;

  timerDuration = mode === "focus"
    ? focusMinutes * 60
    : breakMinutes * 60;

  timerRemaining = timerDuration;

  timerMode.textContent = mode === "focus"
    ? "Focus session"
    : "Break time";

  document.getElementById("focus-mode").textContent =
    `Focus · ${focusMinutes} min`;

  document.getElementById("break-mode").textContent =
    `Break · ${breakMinutes} min`;

  document.getElementById("focus-mode").classList.toggle(
    "active",
    mode === "focus"
  );

  document.getElementById("break-mode").classList.toggle(
    "active",
    mode === "break"
  );

  updateTimerDisplay();
}

function startTimer() {
  if (timerInterval) {
    stopTimer();
    return;
  }

  timerStart.textContent = "Pause";

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();

    if (timerRemaining <= 0) {
      stopTimer();

      if (currentTimerMode === "focus") {
        completedSessions++;

        totalStudyMinutes += focusMinutes;
        dailyStudyMinutes += focusMinutes;

        updateSessionCount();
        updateStudyStats();
      }

      alert(
        currentTimerMode === "focus"
          ? "Focus session complete! Time for a break."
          : "Break finished! Ready to focus again?"
      );

      switchTimerMode(
        currentTimerMode === "focus" ? "break" : "focus"
      );
    }
  }, 1000);
}

// Save focus and break durations
function saveTimerSettings() {
  const newFocus = Number(focusDurationInput.value);
  const newBreak = Number(breakDurationInput.value);

  if (
    !Number.isInteger(newFocus) ||
    newFocus < 1 ||
    newFocus > 180 ||
    !Number.isInteger(newBreak) ||
    newBreak < 1 ||
    newBreak > 60
  ) {
    alert("Focus must be 1–180 minutes and break must be 1–60 minutes.");
    return;
  }

  focusMinutes = newFocus;
  breakMinutes = newBreak;

  localStorage.setItem(
    TIMER_SETTINGS_KEY,
    JSON.stringify({
      focus: focusMinutes,
      break: breakMinutes
    })
  );

  switchTimerMode(currentTimerMode);
}

// Save daily study goal
function saveStudyGoal() {
  const newGoal = Number(dailyGoalInput.value);

  if (!Number.isInteger(newGoal) || newGoal < 1 || newGoal > 1440) {
    alert("Please enter a daily goal between 1 and 1440 minutes.");
    return;
  }

  dailyGoal = newGoal;

  localStorage.setItem(DAILY_GOAL_KEY, dailyGoal);

  updateStudyStats();
}

// Button events
timerStart.addEventListener("click", startTimer);

timerReset.addEventListener("click", () => {
  stopTimer();
  timerRemaining = timerDuration;
  updateTimerDisplay();
});

saveTimerSettingsButton.addEventListener("click", saveTimerSettings);
saveStudyGoalButton.addEventListener("click", saveStudyGoal);

document.getElementById("focus-mode").addEventListener("click", () => {
  switchTimerMode("focus");
});

document.getElementById("break-mode").addEventListener("click", () => {
  switchTimerMode("break");
});

// Initial display
updateSessionCount();
updateTimerDisplay();
updateStudyStats();
document.getElementById("focus-mode").textContent = `Focus · ${focusMinutes} min`;
document.getElementById("break-mode").textContent = `Break · ${breakMinutes} min`;