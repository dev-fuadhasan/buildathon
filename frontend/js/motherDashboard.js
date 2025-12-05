const API = (window.BACKEND_URL_OVERRIDE || "http://localhost:5000").replace(/\/$/, "");
const motherToken = localStorage.getItem("motherToken");

function authHeaders() {
  return { Authorization: `Bearer ${motherToken}`, "Content-Type": "application/json" };
}

async function fetchProfile() {
  if (!motherToken) return;
  const res = await fetch(`${API}/mother/profile`, { headers: authHeaders() });
  const data = await res.json();
  document.getElementById("motherProfile").innerText = data.user ? JSON.stringify(data.user, null, 2) : "No profile";
}

async function sendQuestion() {
  const content = document.getElementById("questionInput").value;
  const res = await fetch(`${API}/mother/questions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content })
  });
  if (res.ok) {
    document.getElementById("questionInput").value = "";
    loadQuestions();
  }
}

async function loadQuestions() {
  const res = await fetch(`${API}/mother/questions`, { headers: authHeaders() });
  const data = await res.json();
  const container = document.getElementById("questionList");
  container.innerHTML = data.questions
    ?.map((q) => `<div class="pill"><strong>Q:</strong> ${q.content}<br/><small>Status: ${q.status}</small></div>`)
    .join("") || "No questions yet.";
}

async function addReminder() {
  const message = document.getElementById("reminderMessage").value;
  const scheduleDate = document.getElementById("reminderDate").value;
  const type = document.getElementById("reminderType").value;
  await fetch(`${API}/mother/reminders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message, scheduleDate, type })
  });
  loadReminders();
}

async function loadReminders() {
  const res = await fetch(`${API}/mother/reminders`, { headers: authHeaders() });
  const data = await res.json();
  const list = document.getElementById("reminderList");
  list.innerHTML = data.reminders?.map((r) => `<li>${r.message} – ${new Date(r.scheduleDate).toLocaleDateString()}</li>`).join("") || "";
}

async function uploadPrescription() {
  const fileInput = document.getElementById("prescriptionFile");
  const file = fileInput.files[0];
  if (!file) return alert("Select a file first");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/upload/prescription`, {
    method: "POST",
    headers: { Authorization: `Bearer ${motherToken}` },
    body: form
  });
  if (res.ok) {
    fileInput.value = "";
    loadUploads();
  } else {
    alert("Upload failed");
  }
}

async function loadUploads() {
  const res = await fetch(`${API}/mother/uploads`, { headers: authHeaders() });
  const data = await res.json();
  const list = document.getElementById("uploadList");
  list.innerHTML = data.uploads?.map((u) => `<li><a href="${u.url}" target="_blank">${u.originalName || u.url}</a></li>`).join("") || "";
}

document.getElementById("btnAskDoctor")?.addEventListener("click", sendQuestion);
document.getElementById("btnAddReminder")?.addEventListener("click", addReminder);
document.getElementById("btnUpload")?.addEventListener("click", uploadPrescription);
document.getElementById("logoutMother")?.addEventListener("click", () => {
  localStorage.removeItem("motherToken");
  location.href = "index.html";
});

fetchProfile();
loadQuestions();
loadReminders();
loadUploads();

