<?php
require_once __DIR__ . '/db.php';
// Return session user info and is_admin flag
header('Content-Type: application/json');
if (empty($_SESSION['user']['email'])) {
    echo json_encode(['logged' => false]);
    exit;
}
$email = $_SESSION['user']['email'];
try {
    $stmt = $pdo->prepare('SELECT name, email, is_admin FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if ($row) {
        echo json_encode(['logged' => true, 'user' => ['email' => $row['email'], 'name' => $row['name']], 'is_admin' => !empty($row['is_admin'])]);
    } else {
        echo json_encode(['logged' => false]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server_error']);
}

?>
