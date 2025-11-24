// Switch between Sign In and Sign Up
const showSignup = document.getElementById("showSignup");
const showSignin = document.getElementById("showSignin");
const signinForm = document.getElementById("signinForm");
const signupForm = document.getElementById("signupForm");

showSignup.addEventListener("click", (e) => {
  e.preventDefault();
  signinForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
});

showSignin.addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.classList.add("hidden");
  signinForm.classList.remove("hidden");
});

// Sign Up
document.getElementById("signup").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (password.length < 6) {
    alert("Password must be at least 6 characters long!");
    return;
  }

  // send to PHP backend (register.php)
  fetch('register.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  }).then(r => r.json()).then(json => {
    if (json && json.ok) {
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', name);
      alert('Account created successfully!');
      window.location.href = 'home.html';
    } else if (json && json.error === 'email_exists') {
      alert('Email already registered. Please sign in.');
    } else {
      alert('Registration failed.');
    }
  }).catch(() => alert('Registration failed (network).'));
});

// Sign In
document.getElementById("signin").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("signinEmail").value.trim();
  const password = document.getElementById("signinPassword").value.trim();
  if (!email || !password) { alert('Please enter your email and password.'); return; }
  fetch('login.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(r => r.json()).then(json => {
    if (json && json.ok) {
      localStorage.setItem('userEmail', email);
      if (json.user && json.user.name) localStorage.setItem('userName', json.user.name);
      alert('Login successful!');
      window.location.href = 'home.html';
    } else {
      alert('Invalid email or password.');
    }
  }).catch(() => alert('Login failed (network).'));
});