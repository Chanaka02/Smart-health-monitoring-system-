<?php
// Admin gate: only allow users with is_admin=1 to access the admin dashboard
require_once __DIR__ . '/db.php';

// if no session user, redirect to login
if (empty($_SESSION['user']['email'])) {
    header('Location: index.html');
    exit;
}

$email = $_SESSION['user']['email'];

try {
    $stmt = $pdo->prepare('SELECT is_admin FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    $isAdmin = ($row && !empty($row['is_admin']));
} catch (Exception $e) {
    $isAdmin = false;
}

if (!$isAdmin) {
    // show forbidden page
    http_response_code(403);
    echo "<!doctype html><html><head><meta charset=\"utf-8\"><title>Forbidden</title></head><body style=\"font-family:Tahoma,Arial;display:flex;align-items:center;justify-content:center;height:100vh;\">";
    echo "<div style=\"max-width:620px;text-align:center;padding:28px;border-radius:8px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,0.12)\">";
    echo "<h2 style=\"color:#333;margin:0 0 12px\">Access denied</h2>";
    echo "<p style=\"color:#555;margin:0 0 18px\">You do not have permission to view the admin dashboard.</p>";
    echo "<a href=\"home.html\" style=\"display:inline-block;padding:10px 14px;border-radius:8px;background:#00c6ff;color:#042f2b;text-decoration:none;font-weight:600\">Return to app</a>";
    echo "</div></body></html>";
    exit;
}

// Serve the admin dashboard HTML (embedded) to the admin user
// Embedded HTML ensures there's no directly accessible admin.html file.
echo <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="home.css">
    <link rel="manifest" href="manifest.json">
</head>
<body class="light-theme">
    <header class="navbar">
        <h1>Admin Dashboard</h1>
        <div class="nav-actions">
            <a href="home.html" class="admin-link show">Back to App</a>
        </div>
    </header>

    <main style="padding:20px; max-width:1100px; margin:18px auto;">
        <section class="admin-panel">
            <div class="admin-grid">
                <div class="admin-card">
                    <h3>LocalStorage Snapshot</h3>
                    <pre id="lsDump" class="admin-dump"></pre>
                    <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
                        <button id="refreshBtn" class="btn btn-primary">Refresh</button>
                        <button id="clearBtn" class="btn btn-secondary">Clear localStorage</button>
                        <button id="exportBtn" class="btn btn-ghost">Export JSON</button>
                    </div>
                </div>

                <div class="admin-card">
                    <h3>Metrics</h3>
                    <p>Total keys: <strong id="adminKeysCount">0</strong></p>
                    <p>Health history entries: <strong id="healthCount">0</strong></p>
                    <p>Water consumed: <strong id="adminWaterConsumed">-</strong></p>
                    <p>Water goal: <strong id="adminWaterGoal">-</strong></p>
                    <hr style="margin:12px 0">
                    <h4>Admin Controls</h4>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
                        <label style="display:flex;gap:6px;align-items:center">Water goal (L): <input id="adminWaterGoalInput" type="number" step="0.1" style="width:96px"></label>
                        <label style="display:flex;gap:6px;align-items:center">Reminder (min): <input id="adminWaterIntervalInput" type="number" min="1" style="width:96px"></label>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <button id="applyDefaultsBtn" class="btn btn-primary">Save Defaults</button>
                        <button id="resetWaterBtn" class="btn btn-ghost">Reset Water</button>
                        <button id="clearHealthBtn" class="btn btn-secondary">Clear Health History</button>
                        <button id="copyDumpBtn" class="btn btn-ghost">Copy Dump</button>
                    </div>
                </div>
            </div>
      
            <div style="margin-top:18px">
                <div class="admin-card">
                    <h3>Events / Logs</h3>
                    <p style="margin:6px 0 8px 0;opacity:0.9">Recent health/water entries (from localStorage)</p>
                    <pre id="eventsDump" class="admin-dump" style="max-height:280px;overflow:auto"></pre>
                </div>
            </div>
        </section>
    </main>

    <script src="admin.js"></script>
</body>
</html>
HTML;
exit;

?>
