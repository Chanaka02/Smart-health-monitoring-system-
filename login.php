<?php
require_once __DIR__ . '/db.php';

$data = get_input();
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_input']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(401);
        echo json_encode(['error' => 'invalid_credentials']);
        exit;
    }

    if (!password_verify($password, $row['password'] ?? '')) {
        http_response_code(401);
        echo json_encode(['error' => 'invalid_credentials']);
        exit;
    }

    $_SESSION['user'] = ['email' => $row['email'], 'name' => $row['name']];
    echo json_encode(['ok' => true, 'user' => ['email' => $row['email'], 'name' => $row['name']]]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server_error', 'message' => $e->getMessage()]);
}

?>
