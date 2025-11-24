<?php
require_once __DIR__ . '/db.php';

try {
    $metrics = [];
    $row = $pdo->query('SELECT COUNT(*) AS cnt FROM water_logs')->fetch();
    $metrics['water_count'] = $row ? intval($row['cnt']) : 0;
    $row2 = $pdo->query('SELECT COUNT(*) AS cnt FROM health_logs')->fetch();
    $metrics['health_count'] = $row2 ? intval($row2['cnt']) : 0;
    $row3 = $pdo->query('SELECT COALESCE(SUM(amount),0) AS total FROM water_logs')->fetch();
    $metrics['water_total'] = $row3 ? floatval($row3['total']) : 0;
    header('Content-Type: application/json');
    echo json_encode($metrics);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server_error', 'message' => $e->getMessage()]);
}

?>
