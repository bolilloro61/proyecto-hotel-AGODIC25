<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../api/db.php';

try {
    // Recibir parámetros
    $fechaEntrada = $_GET['fecha_entrada'] ?? null;
    $fechaSalida = $_GET['fecha_salida'] ?? null;
    $id_habitacion = $_GET['id_habitacion'] ?? null;

    if (!$fechaEntrada || !$fechaSalida) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'message' => 'Fechas requeridas'
        ]);
        exit;
    }

    // Validar que las fechas sean válidas
    $fecha_entrada = strtotime($fechaEntrada);
    $fecha_salida = strtotime($fechaSalida);

    if (!$fecha_entrada || !$fecha_salida || $fecha_entrada >= $fecha_salida) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'message' => 'Fechas inválidas'
        ]);
        exit;
    }

    // Si se pide una habitación específica
    if ($id_habitacion) {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as conflictos
            FROM reservas
            WHERE id_habitacion = ?
            AND estado != 'cancelada'
            AND (
                (fecha_entrada < ? AND fecha_salida > ?)
                OR (fecha_entrada < ? AND fecha_salida > ?)
                OR (fecha_entrada >= ? AND fecha_salida <= ?)
            )
        ");
        
        $stmt->execute([
            $id_habitacion,
            $fechaSalida, $fechaEntrada,  // Traslape
            $fechaSalida, $fechaEntrada,  // Traslape
            $fechaEntrada, $fechaSalida   // Incluida
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $disponible = $result['conflictos'] == 0;

        echo json_encode([
            'ok' => true,
            'disponible' => $disponible,
            'conflictos' => $result['conflictos']
        ]);
    } else {
        // Retornar todas las habitaciones y su disponibilidad
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'message' => 'ID de habitación requerido'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}
?>
