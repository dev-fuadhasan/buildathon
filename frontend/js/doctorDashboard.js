const API_URL = (window.BACKEND_URL_OVERRIDE || "http://localhost:5000").replace(/\/$/, "");
const doctorToken = localStorage.getItem("doctorToken");

function doctorHeaders() {
  return { Authorization: `Bearer ${doctorToken}`, "Content-Type": "application/json" };
}

async function loadStatus() {
  const res = await fetch(`${API_URL}/doctor/status`, { headers: doctorHeaders() });
  const data = await res.json();
  document.getElementById("doctorStatus").innerText = data.doctor ? `Status: ${data.doctor.status}` : "No profile";
}

async function loadQuestionsForDoctor() {
  const res = await fetch(`${API_URL}/doctor/questions`, { headers: doctorHeaders() });
  const data = await res.json();
  const container = document.getElementById("doctorQuestions");
  container.innerHTML =
    data.questions
      ?.map(
        (q) => `<div class="pill"><strong>${q.mother?.name || "Mother"}:</strong> ${q.content}
        <textarea data-question="${q._id}" placeholder="Write a reply"></textarea>
        <button class="btn primary" data-answer="${q._id}">Send Reply</button></div>`
      )
      .join("") || "No questions.";
  container.querySelectorAll("button[data-answer]").forEach((btn) => {
    btn.addEventListener("click", () => submitAnswer(btn.dataset.answer));
  });
}

async function submitAnswer(questionId) {
  const textArea = document.querySelector(`textarea[data-question="${questionId}"]`);
  const content = textArea?.value;
  await fetch(`${API_URL}/doctor/answers`, {
    method: "POST",
    headers: doctorHeaders(),
    body: JSON.stringify({ questionId, content })
  });
  loadQuestionsForDoctor();
}

async function saveAvailability() {
  const availabilityText = document.getElementById("availabilityInput").value || "[]";
  let availability = [];
  try {
    availability = JSON.parse(availabilityText);
  } catch (e) {
    return alert("Availability must be valid JSON array.");
  }
  await fetch(`${API_URL}/doctor/availability`, {
    method: "PUT",
    headers: doctorHeaders(),
    body: JSON.stringify({ availability })
  });
  loadStatus();
}

document.getElementById("btnUpdateAvailability")?.addEventListener("click", saveAvailability);
document.getElementById("logoutDoctor")?.addEventListener("click", () => {
  localStorage.removeItem("doctorToken");
  location.href = "index.html";
});

loadStatus();
loadQuestionsForDoctor();

