<?php
header('Content-Type: application/json');
require_once '../api/db.php';

try {
    $usuarioId = $_GET['usuario_id'] ?? null;
    
    if (!$usuarioId) {
        throw new Exception('Usuario ID no especificado');
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            r.id_reserva,
            r.id_habitacion,
            r.fecha_entrada,
            r.fecha_salida,
            r.estado,
            h.numero_habitacion,
            h.nombre_habitacion,
            h.precio
        FROM reservas r
        JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
        WHERE r.id_usuario = ?
        ORDER BY r.fecha_entrada DESC
    ");
    
    $stmt->execute([$usuarioId]);
    $reservaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'ok' => true,
        'reservaciones' => $reservaciones
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}
?>
