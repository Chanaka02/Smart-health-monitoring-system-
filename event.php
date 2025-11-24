<?php
require_once __DIR__ . '/db.php';

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['type']) || empty($data['payload'])) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_payload']);
    exit;
}

$type = $data['type'];
$payload = $data['payload'];

$user = $payload['user'] ?? ($_SESSION['user']['email'] ?? null);

try {
    if ($type === 'water') {
        $ts = $payload['ts'] ?? time() * 1000;
        $amount = floatval($payload['amount'] ?? 0);
        $ins = $pdo->prepare('INSERT INTO water_logs (ts, user_email, amount) VALUES (?, ?, ?)');
        $ins->execute([$ts, $user, $amount]);
        echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
        exit;
    }
    if ($type === 'health') {
        $ts = $payload['ts'] ?? time() * 1000;
        $hr = isset($payload['hr']) ? intval($payload['hr']) : null;
        $steps = isset($payload['steps']) ? intval($payload['steps']) : 0;
        $stress = $payload['stress'] ?? null;
        $ins = $pdo->prepare('INSERT INTO health_logs (ts, user_email, heart_rate, steps, stress) VALUES (?, ?, ?, ?, ?)');
        $ins->execute([$ts, $user, $hr, $steps, $stress]);
        echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
        exit;
    }
    http_response_code(400);
    echo json_encode(['error' => 'unknown_type']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server_error', 'message' => $e->getMessage()]);
}

?>
