window.addEventListener("DOMContentLoaded", () => {
  const userEmail = localStorage.getItem("userEmail") || "Guest";
  const welcome = document.querySelector(".welcome h2");
  welcome.textContent = `Welcome ${userEmail.split('@')[0]} 👋`;
});

// theme toggle: persist light/dark preference
(() => {
  const toggle = document.getElementById('themeToggle');
  const body = document.body;
  function applyTheme(t) {
    if (t === 'light') body.classList.add('light-theme');
    else body.classList.remove('light-theme');
    localStorage.setItem('theme', t);
  }
  const stored = localStorage.getItem('theme') || 'light';
  applyTheme(stored);
  if (toggle) toggle.addEventListener('click', () => {
    const cur = body.classList.contains('light-theme') ? 'light' : 'dark';
    applyTheme(cur === 'light' ? 'dark' : 'light');
  });
})();

document.getElementById("calcBMI").addEventListener("click", function () {
  const height = parseFloat(document.getElementById("height").value) / 100;
  const weight = parseFloat(document.getElementById("weight").value);
  const result = document.getElementById("bmiResult");

  if (height && weight) {
    const bmi = (weight / (height * height)).toFixed(2);
    let status = "";
    if (bmi < 18.5) status = "Underweight";
    else if (bmi < 24.9) status = "Normal";
    else if (bmi < 29.9) status = "Overweight";
    else status = "Obese";
    result.innerText = `Your BMI is ${bmi} (${status})`;
  } else {
    result.innerText = "Please enter valid height and weight.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  alert("You have logged out successfully.");
  localStorage.clear();
  window.location.href = "index.html";
});

/* ===== Water reminder feature ===== */
(() => {
  const ls = window.localStorage;
  const consumedEl = document.getElementById('waterConsumed');
  const goalEl = document.getElementById('waterGoal');
  const enableEl = document.getElementById('enableReminder');
  const intervalEl = document.getElementById('reminderInterval');
  const startBtn = document.getElementById('startReminder');
  const stopBtn = document.getElementById('stopReminder');
  const addGlassBtn = document.getElementById('addGlass');
  const resetBtn = document.getElementById('resetWater');
  const testBtn = document.getElementById('testNotification');

  let reminderTimer = null;

  const DEFAULT_GOAL = 2.5; // liters
  function getNumber(key, fallback) {
    const v = parseFloat(ls.getItem(key));
    return isNaN(v) ? fallback : v;
  }

  const state = {
    consumed: getNumber('water_consumed', 0),
    goal: getNumber('water_goal', DEFAULT_GOAL),
    enabled: ls.getItem('water_enabled') === 'true',
    intervalMinutes: getNumber('water_interval_minutes', 60),
    lastResetDate: ls.getItem('water_last_reset') || null,
  };

  function saveState() {
    ls.setItem('water_consumed', state.consumed);
    ls.setItem('water_goal', state.goal);
    ls.setItem('water_enabled', state.enabled);
    ls.setItem('water_interval_minutes', state.intervalMinutes);
    if (state.lastResetDate) ls.setItem('water_last_reset', state.lastResetDate);
  }

  function todayDateString() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function scheduleMidnightReset() {
    try {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ms = nextMidnight - now;
      setTimeout(() => {
        performDailyReset();
        // schedule subsequent resets every 24h
        setInterval(performDailyReset, 24 * 60 * 60 * 1000);
      }, ms + 1000);
    } catch (e) { /* ignore scheduling errors */ }
  }

  function performDailyReset() {
    const today = todayDateString();
    if (state.lastResetDate !== today) {
      state.consumed = 0;
      state.lastResetDate = today;
      saveState();
      updateUI();
      // optionally notify the user
      try { showNotification('Daily Reset', 'Water progress has been reset for today.'); } catch(e){}
    }
  }

  function updateUI() {
    consumedEl.textContent = `${state.consumed.toFixed(2)} L`;
    goalEl.textContent = `${state.goal} L`;
    enableEl.checked = state.enabled;
    intervalEl.value = state.intervalMinutes;
    // update visual meter if present
    try {
      const meter = document.querySelector('.water-meter > i');
      const pctEl = document.getElementById('waterPercent');
      if (meter) {
        const pct = state.goal > 0 ? Math.min(100, (state.consumed / state.goal) * 100) : 0;
        meter.style.width = pct + '%';
        if (pctEl) pctEl.textContent = Math.round(pct) + '%';
      }
    } catch (e) {
      // ignore
    }
  }

  function showNotification(title, body) {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (window.Notification && Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') new Notification(title, { body });
        else alert(body);
      });
    } else {
      // Fallback
      alert(body);
    }
  }

  function startReminders() {
    stopReminders();
    const ms = Math.max(1, state.intervalMinutes) * 60 * 1000;
    reminderTimer = setInterval(() => {
      showNotification('Hydration Reminder', 'Time to drink water 💧 — take a sip!');
    }, ms);
    state.enabled = true;
    saveState();
    updateUI();
  }

  function stopReminders() {
    if (reminderTimer) {
      clearInterval(reminderTimer);
      reminderTimer = null;
    }
    state.enabled = false;
    saveState();
    updateUI();
  }

  function addGlass(amountLiters = 0.25) {
    // ensure daily reset hasn't been missed
    const today = todayDateString();
    if (state.lastResetDate && state.lastResetDate !== today) {
      state.consumed = 0;
      state.lastResetDate = today;
    }
    state.consumed = Math.max(0, state.consumed + amountLiters);
    saveState();
    updateUI();
    // try to send to backend (non-blocking)
    try {
      fetch('event.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'water', payload: { ts: Date.now(), amount: amountLiters, user: localStorage.getItem('userEmail') || null } })
      }).catch(()=>{});
    } catch(e){}
  }

  // wire events
  startBtn.addEventListener('click', () => {
    state.intervalMinutes = Math.max(1, parseInt(intervalEl.value) || 60);
    // ask for permission proactively
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    startReminders();
  });

  stopBtn.addEventListener('click', () => stopReminders());

  addGlassBtn.addEventListener('click', () => addGlass(0.25));

  // manual reset handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset today\'s water progress to 0?')) return;
      state.consumed = 0;
      state.lastResetDate = todayDateString();
      saveState();
      updateUI();
      try { showNotification('Reset', 'Water progress has been reset.'); } catch(e){}
    });
  }

  enableEl.addEventListener('change', (e) => {
    state.enabled = e.target.checked;
    if (state.enabled) startReminders();
    else stopReminders();
  });

  intervalEl.addEventListener('change', (e) => {
    const v = Math.max(1, parseInt(e.target.value) || 60);
    state.intervalMinutes = v;
    if (state.enabled) startReminders();
    else saveState();
  });

  testBtn.addEventListener('click', () => showNotification('Test Notification', 'This is a test — drink a glass of water!'));

  // initialize
  // perform daily reset check on load
  performDailyReset();
  // schedule a reset at next midnight while page is open
  scheduleMidnightReset();
  updateUI();
  if (state.enabled) startReminders();

  // expose for debugging in console
  window.__waterReminder = { state, startReminders, stopReminders, addGlass, performDailyReset };
})();

/* ===== Health monitoring feature ===== */
(() => {
  const lsKey = 'health_history';
  const listEl = document.getElementById('healthHistoryList');
  const hrEl = document.getElementById('hrValue');
  const stepsEl = document.getElementById('stepsValue');
  const stressEl = document.getElementById('stressValue');
  const startBtn = document.getElementById('startMonitor');
  const stopBtn = document.getElementById('stopMonitor');
  const simBtn = document.getElementById('simulateOnce');
  const clearBtn = document.getElementById('clearHistory');
  const intervalInput = document.getElementById('monitorInterval');

  let monitorTimer = null;

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(lsKey)) || []; }
    catch { return []; }
  }

  function saveHistory(hist) { localStorage.setItem(lsKey, JSON.stringify(hist)); }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  }

  function renderHistory() {
    const hist = readHistory();
    listEl.innerHTML = '';
    hist.slice().reverse().slice(0, 20).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${formatTime(item.ts)} — HR: ${item.hr} bpm, Steps: ${item.steps}, Stress: ${item.stress}`;
      listEl.appendChild(li);
    });
  }

  function updateCurrentDisplay(sample) {
    hrEl.textContent = sample.hr + ' bpm';
    stepsEl.textContent = sample.steps;
    stressEl.textContent = sample.stress;
  }

  function generateSample(prevSteps = 0) {
    // simple realistic-ish random values
    const hr = Math.round(60 + Math.random() * 40); // 60-100
    const steps = prevSteps + Math.round(Math.random() * 10); // incremental
    const stressLevel = Math.random();
    const stress = stressLevel < 0.33 ? 'Low' : stressLevel < 0.66 ? 'Normal' : 'High';
    return { ts: Date.now(), hr, steps, stress };
  }

  function pushSample(sample) {
    const hist = readHistory();
    hist.push(sample);
    // keep only last 1000 entries to avoid unbounded growth
    if (hist.length > 1000) hist.splice(0, hist.length - 1000);
    saveHistory(hist);
    updateCurrentDisplay(sample);
    renderHistory();
    // try to send to backend
    try {
      fetch('event.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'health', payload: Object.assign({}, sample, { user: localStorage.getItem('userEmail') || null }) })
      }).catch(()=>{});
    } catch(e){}
  }

  function startMonitor() {
    stopMonitor();
    const intervalSec = Math.max(1, parseInt(intervalInput.value) || 5);
    let lastSteps = (readHistory().slice(-1)[0] || {}).steps || 0;
    monitorTimer = setInterval(() => {
      const sample = generateSample(lastSteps);
      lastSteps = sample.steps;
      pushSample(sample);
    }, intervalSec * 1000);
  }

  function stopMonitor() {
    if (monitorTimer) { clearInterval(monitorTimer); monitorTimer = null; }
  }

  startBtn.addEventListener('click', () => {
    startMonitor();
    startBtn.textContent = 'Monitoring...';
  });
  stopBtn.addEventListener('click', () => { stopMonitor(); startBtn.textContent = 'Start Monitoring'; });
  simBtn.addEventListener('click', () => {
    const prev = (readHistory().slice(-1)[0] || {}).steps || 0;
    pushSample(generateSample(prev));
  });
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear health history? This cannot be undone.')) {
      localStorage.removeItem(lsKey);
      renderHistory();
    }
  });

  // init display
  (function init() {
    const hist = readHistory();
    if (hist.length) updateCurrentDisplay(hist.slice(-1)[0]);
    renderHistory();
    window.__healthMonitor = { startMonitor, stopMonitor, pushSample, readHistory };
  })();

})();