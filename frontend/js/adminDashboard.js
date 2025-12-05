const API_BASE = (window.BACKEND_URL_OVERRIDE || "http://localhost:5000").replace(/\/$/, "");
const adminToken = localStorage.getItem("adminToken");

function adminHeaders() {
  return { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" };
}

async function loadDoctors() {
  const res = await fetch(`${API_BASE}/admin/doctors`, { headers: adminHeaders() });
  const data = await res.json();
  const pending = data.doctors?.filter((d) => d.status === "pending") || [];
  const container = document.getElementById("pendingDoctors");
  container.innerHTML =
    pending
      .map(
        (d) => `<div class="pill"><strong>${d.user?.name}</strong> (${d.specialization})
        <button class="btn primary" data-approve="${d._id}">Approve</button>
        <button class="btn ghost" data-reject="${d._id}">Reject</button></div>`
      )
      .join("") || "No pending doctors.";
  container.querySelectorAll("[data-approve]").forEach((btn) => btn.addEventListener("click", () => approveDoctor(btn.dataset.approve)));
  container.querySelectorAll("[data-reject]").forEach((btn) => btn.addEventListener("click", () => rejectDoctor(btn.dataset.reject)));
}

async function approveDoctor(id) {
  await fetch(`${API_BASE}/admin/doctors/${id}/approve`, { method: "POST", headers: adminHeaders() });
  loadDoctors();
}
async function rejectDoctor(id) {
  await fetch(`${API_BASE}/admin/doctors/${id}/reject`, { method: "POST", headers: adminHeaders() });
  loadDoctors();
}

async function loadQuestionsAdmin() {
  const res = await fetch(`${API_BASE}/admin/questions`, { headers: adminHeaders() });
  const data = await res.json();
  const container = document.getElementById("adminQuestions");
  container.innerHTML =
    data.questions
      ?.map(
        (q) => `<div class="pill"><strong>${q.mother?.name}:</strong> ${q.content}
        <button class="btn ghost" data-delete="${q._id}">Delete</button></div>`
      )
      .join("") || "No questions.";
  container.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteQuestion(btn.dataset.delete)));
}

async function deleteQuestion(id) {
  await fetch(`${API_BASE}/admin/questions/${id}`, { method: "DELETE", headers: adminHeaders() });
  loadQuestionsAdmin();
}

async function loadMothers() {
  const res = await fetch(`${API_BASE}/admin/mothers`, { headers: adminHeaders() });
  const data = await res.json();
  const container = document.getElementById("adminMothers");
  container.innerHTML = data.mothers?.map((m) => `<div class="pill">${m.name} – ${m.email}</div>`).join("") || "No mothers.";
}

document.getElementById("logoutAdmin")?.addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  location.href = "index.html";
});

loadDoctors();
loadQuestionsAdmin();
loadMothers();

