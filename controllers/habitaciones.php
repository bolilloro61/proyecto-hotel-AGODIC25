<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../api/db.php';

try {
    // Obtener todas las habitaciones de la base de datos
    $stmt = $pdo->prepare("
        SELECT 
            id_habitacion,
            numero_habitacion,
            tipo,
            precio,
            descripcion,
            nombre_habitacion,
            capacidad,
            imagen
        FROM habitaciones
        ORDER BY numero_habitacion ASC
    ");
    
    $stmt->execute();
    $habitaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Responder con JSON
    http_response_code(200);
    echo json_encode([
        'ok' => true,
        'count' => count($habitaciones),
        'data' => $habitaciones
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Error en la base de datos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
