<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../api/db.php';

try {
    $id_habitacion = $_GET['id_habitacion'] ?? null;
    $fecha_entrada = $_GET['fecha_entrada'] ?? null;
    $fecha_salida = $_GET['fecha_salida'] ?? null;
    $plan = $_GET['plan'] ?? 'estandar';

    if (!$id_habitacion || !$fecha_entrada || !$fecha_salida) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'message' => 'Parámetros requeridos'
        ]);
        exit;
    }

    // Obtener precio base de la habitación
    $stmt = $pdo->prepare("SELECT precio FROM habitaciones WHERE id_habitacion = ?");
    $stmt->execute([$id_habitacion]);
    $habitacion = $stmt->fetch();

    if (!$habitacion) {
        throw new Exception('Habitación no encontrada');
    }

    $precioBase = $habitacion['precio'];

    // Calcular número de noches
    $entrada = new DateTime($fecha_entrada);
    $salida = new DateTime($fecha_salida);
    $interval = $entrada->diff($salida);
    $noches = $interval->days;

    if ($noches < 1) {
        $noches = 1;
    }

    // Obtener tarifa según fechas
    $stmt_tarifa = $pdo->prepare("
        SELECT porcentaje
        FROM tarifas_temporada
        WHERE ? BETWEEN fecha_inicio AND fecha_fin
        LIMIT 1
    ");
    
    $stmt_tarifa->execute([$fecha_entrada]);
    $tarifa_resultado = $stmt_tarifa->fetch();
    
    $porcentajeTarifa = $tarifa_resultado ? $tarifa_resultado['porcentaje'] : 1.00;

    // Calcular precio total
    $precioTotal = $precioBase * $noches * $porcentajeTarifa;

    // Si es all inclusive, duplicar
    if ($plan === 'all_inclusive') {
        $precioTotal = $precioTotal * 2;
    }

    echo json_encode([
        'ok' => true,
        'precio_base' => (float) $precioBase,
        'noches' => $noches,
        'porcentaje_tarifa' => (float) $porcentajeTarifa,
        'plan' => $plan,
        'precio_total' => round($precioTotal, 2),
        'precio_por_noche' => round($precioBase * $porcentajeTarifa, 2)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}
?>
