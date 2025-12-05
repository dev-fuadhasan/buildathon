const API_ROOT = (window.BACKEND_URL_OVERRIDE || "http://localhost:5000").replace(/\/$/, "");

document.getElementById("contactForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Thanks for reaching out! We will contact you soon.");
});

async function motherSignup() {
  const payload = {
    name: document.getElementById("motherName").value,
    email: document.getElementById("motherEmail").value,
    password: document.getElementById("motherPassword").value,
    age: document.getElementById("motherAge").value,
    trimester: document.getElementById("motherTrimester").value
  };
  const res = await fetch(`${API_ROOT}/auth/register/mother`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("motherToken", data.token);
    alert("Mother account created. You can access the dashboard.");
  } else {
    alert(data.error || "Signup failed");
  }
}

async function doctorSignup() {
  const payload = {
    name: document.getElementById("docName").value,
    email: document.getElementById("docEmail").value,
    password: document.getElementById("docPassword").value,
    specialization: document.getElementById("docSpecialization").value,
    experience: document.getElementById("docExperience").value,
    hospital: document.getElementById("docHospital").value,
    bmdCertificate: document.getElementById("docBmd").value,
    nidOrLicenseUrl: document.getElementById("docLicense").value
  };
  const res = await fetch(`${API_ROOT}/auth/register/doctor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("doctorToken", data.token);
    alert("Doctor registered. Await admin approval.");
  } else {
    alert(data.error || "Doctor signup failed");
  }
}

async function login() {
  const payload = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  };
  const res = await fetch(`${API_ROOT}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || "Login failed");
  const role = document.getElementById("loginRole").value;
  if (role === "mother") localStorage.setItem("motherToken", data.token);
  if (role === "doctor") localStorage.setItem("doctorToken", data.token);
  if (role === "admin") localStorage.setItem("adminToken", data.token);
  alert("Logged in. Open the dashboard for your role.");
}

document.getElementById("btnMotherSignup")?.addEventListener("click", motherSignup);
document.getElementById("btnDoctorSignup")?.addEventListener("click", doctorSignup);
document.getElementById("btnLogin")?.addEventListener("click", login);

