const BACKEND_URL = (window.BACKEND_URL_OVERRIDE || "http://localhost:5000").replace(/\/$/, "");

async function askMomsCare() {
  const userMessage = document.getElementById("msg").value;
  if (!userMessage.trim()) return;
  const res = await fetch(`${BACKEND_URL}/chatbot/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage })
  });
  const data = await res.json();
  document.getElementById("reply").innerText = data.reply || "No reply received.";
}

window.askMomsCare = askMomsCare;

