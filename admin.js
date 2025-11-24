document.addEventListener('DOMContentLoaded', () => {
  const dump = document.getElementById('lsDump');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const applyDefaultsBtn = document.getElementById('applyDefaultsBtn');
  const resetWaterBtn = document.getElementById('resetWaterBtn');
  const clearHealthBtn = document.getElementById('clearHealthBtn');
  const copyDumpBtn = document.getElementById('copyDumpBtn');
  const adminWaterGoalInput = document.getElementById('adminWaterGoalInput');
  const adminWaterIntervalInput = document.getElementById('adminWaterIntervalInput');
  const eventsDump = document.getElementById('eventsDump');

  function readAllLocalStorage() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      try { out[k] = JSON.parse(localStorage.getItem(k)); }
      catch { out[k] = localStorage.getItem(k); }
    }
    return out;
  }

  function refresh() {
    const data = readAllLocalStorage();
    dump.textContent = JSON.stringify(data, null, 2);
    updateMetrics(data);
  }

  // Also try to fetch backend metrics if server is running
  function fetchServerMetrics() {
    fetch('/api/metrics').then(r => r.json()).then(m => {
      // merge into UI
      document.getElementById('serverMetrics')?.remove();
      const node = document.createElement('div');
      node.id = 'serverMetrics';
      node.style.marginTop = '12px';
      node.innerHTML = `<h4>Server metrics</h4>
        <p>Water logs: <strong>${m.water_count}</strong></p>
        <p>Health logs: <strong>${m.health_count}</strong></p>
        <p>Total water recorded: <strong>${m.water_total}</strong></p>`;
      document.querySelector('.admin-card')?.appendChild(node);
    }).catch(()=>{
      // server not available — ignore
    });
  }

  function updateMetrics(data) {
    const keys = Object.keys(data || {});
    const health = data['health_history'] || [];
    const waterConsumed = data['water_consumed'] || null;
    const waterGoal = data['water_goal'] || null;
    const keysCountEl = document.getElementById('adminKeysCount');
    const healthCountEl = document.getElementById('healthCount');
    const waterConsumedEl = document.getElementById('adminWaterConsumed');
    const waterGoalEl = document.getElementById('adminWaterGoal');
    if (keysCountEl) keysCountEl.textContent = keys.length;
    if (healthCountEl) healthCountEl.textContent = (Array.isArray(health) ? health.length : 0);
    if (waterConsumedEl) waterConsumedEl.textContent = (waterConsumed !== null ? waterConsumed : '-');
    if (waterGoalEl) waterGoalEl.textContent = (waterGoal !== null ? waterGoal : '-');
    // populate inputs for quick admin edits
    if (adminWaterGoalInput) adminWaterGoalInput.value = (waterGoal !== null ? waterGoal : '');
    const interval = data['water_interval_minutes'] || data['reminder_interval'] || '';
    if (adminWaterIntervalInput) adminWaterIntervalInput.value = (interval !== null ? interval : '');
  }

  refreshBtn.addEventListener('click', refresh);

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all localStorage data? This cannot be undone.')) {
      localStorage.clear();
      refresh();
      alert('localStorage cleared.');
    }
  });

  exportBtn.addEventListener('click', () => {
    const data = readAllLocalStorage();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localstorage-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // copy dump to clipboard
  if (copyDumpBtn) copyDumpBtn.addEventListener('click', () => {
    const data = readAllLocalStorage();
    const text = JSON.stringify(data, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => alert('LocalStorage JSON copied to clipboard.'))
        .catch(() => alert('Copy failed — try Export JSON.'));
    } else {
      alert('Clipboard API not available. Use Export JSON.');
    }
  });

  // apply defaults (save goal & interval)
  if (applyDefaultsBtn) applyDefaultsBtn.addEventListener('click', () => {
    const g = parseFloat(adminWaterGoalInput.value);
    const i = parseInt(adminWaterIntervalInput.value, 10);
    if (!isNaN(g)) localStorage.setItem('water_goal', String(g));
    if (!isNaN(i) && i > 0) localStorage.setItem('water_interval_minutes', String(i));
    alert('Defaults saved to localStorage for this browser.');
    refresh();
  });

  // reset water progress only
  if (resetWaterBtn) resetWaterBtn.addEventListener('click', () => {
    if (!confirm('Reset water progress (consumed) to 0 for this browser?')) return;
    localStorage.setItem('water_consumed', '0');
    // set last reset to today
    const d = new Date();
    const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('water_last_reset', today);
    alert('Water progress reset.');
    refresh();
  });

  // clear health history only
  if (clearHealthBtn) clearHealthBtn.addEventListener('click', () => {
    if (!confirm('Clear health history? This cannot be undone.')) return;
    localStorage.removeItem('health_history');
    alert('Health history cleared.');
    refresh();
  });

  // render events/logs area from known keys
  function renderEvents(data) {
    try {
      const parts = [];
      const health = data['health_history'] || [];
      if (Array.isArray(health) && health.length) {
        parts.push('--- Health samples (last 50) ---');
        health.slice(-50).forEach(h => parts.push(JSON.stringify(h)));
      }
      // water-related
      if (data['water_consumed'] !== undefined || data['water_goal'] !== undefined) {
        parts.push('--- Water keys ---');
        parts.push('consumed: ' + (data['water_consumed'] === undefined ? '-' : data['water_consumed']));
        parts.push('goal: ' + (data['water_goal'] === undefined ? '-' : data['water_goal']));
        parts.push('last_reset: ' + (data['water_last_reset'] === undefined ? '-' : data['water_last_reset']));
      }
      // any other keys with "event" in name
      Object.keys(data).forEach(k => {
        if (/event|log|history/i.test(k) && !['health_history'].includes(k)) {
          parts.push('--- ' + k + ' ---');
          parts.push(JSON.stringify(data[k]));
        }
      });
      eventsDump.textContent = parts.length ? parts.join('\n') : 'No local events found.';
    } catch (e) { eventsDump.textContent = 'Error rendering events.' }
  }

  refresh();
  fetchServerMetrics();
  // render events panel
  renderEvents(readAllLocalStorage());
});
