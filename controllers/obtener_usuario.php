<?php
header('Content-Type: application/json');
session_start();
require_once '../api/db.php';

try {
    if (!isset($_SESSION['usuario'])) {
        echo json_encode([
            'ok' => false,
            'message' => 'No hay sesión activa'
        ]);
        exit;
    }

    $usuarioId = $_SESSION['usuario'];
    
    $stmt = $pdo->prepare("
        SELECT id_usuario, email, rol
        FROM usuarios
        WHERE id_usuario = ?
    ");
    
    $stmt->execute([$usuarioId]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$usuario) {
        echo json_encode([
            'ok' => false,
            'message' => 'Usuario no encontrado'
        ]);
        exit;
    }
    
    echo json_encode([
        'ok' => true,
        'usuario' => $usuario
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}
?>
