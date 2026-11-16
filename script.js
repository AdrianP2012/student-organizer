const STORAGE_KEY = "studenthub_tasks_v1";
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
  document.getElementById("remaining-count").textContent = remaining;
  document.getElementById("completed-count").textContent = completed;
  document.getElementById("total-count").textContent = tasks.length;

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
  const filtered = tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
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
        <div class="task-meta">${escapeHTML(task.subject || "General")} · ${escapeHTML(formatDate(task.due))}</div>
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

function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `${name}-view`));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === name));
  document.getElementById("page-title").textContent = name === "dashboard" ? "Dashboard" :
    name === "tasks" ? "My tasks" : "Schedule";
}

document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));

updateDate();
refresh();
