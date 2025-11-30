<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once '../api/db.php';

try {
    // Obtener datos del POST
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Datos inválidos o vacíos');
    }

    // Extraer datos
    $id_reserva = $data['id_reserva'] ?? null;
    $metodo = $data['metodo'] ?? null;
    $monto = $data['monto'] ?? null;

    // Validar que el método sea uno de los valores ENUM permitidos
    $metodosPermitidos = ['tarjeta', 'paypal', 'efectivo'];
    if (!in_array($metodo, $metodosPermitidos)) {
        throw new Exception('Método de pago inválido. Debe ser: tarjeta, paypal o efectivo');
    }

    if (!$id_reserva || !$metodo) {
        throw new Exception('Campos requeridos faltantes (id_reserva, metodo)');
    }

    // Verificar que la reserva existe
    $stmt_check = $pdo->prepare("
        SELECT id_reserva, estado 
        FROM reservas 
        WHERE id_reserva = ?
    ");
    $stmt_check->execute([$id_reserva]);
    $reserva = $stmt_check->fetch();

    if (!$reserva) {
        throw new Exception('Reserva no encontrada');
    }

    if ($reserva['estado'] !== 'pendiente') {
        throw new Exception('La reserva no está en estado pendiente. Estado actual: ' . $reserva['estado']);
    }

    // Obtener el pago pendiente de la reserva
    $stmt_pago = $pdo->prepare("
        SELECT id_pago, monto, estado 
        FROM pagos 
        WHERE id_reserva = ? AND estado = 'pendiente'
        LIMIT 1
    ");
    $stmt_pago->execute([$id_reserva]);
    $pago = $stmt_pago->fetch();

    if (!$pago) {
        throw new Exception('No hay un pago pendiente para esta reserva');
    }

        // Actualizar el pago con el método y cambiar estado a 'pagado'
        $stmt_update_pago = $pdo->prepare("UPDATE pagos SET metodo = ?, estado = 'pagado', fecha_pago = NOW() WHERE id_pago = ?");
        $success = $stmt_update_pago->execute([$metodo, $pago['id_pago']]);

        if (!$success) {
            $errorInfo = $stmt_update_pago->errorInfo();
            throw new Exception('Error al actualizar el pago: ' . $errorInfo[2]);
        }

        // NOTA: No marcamos la reserva como 'confirmada' automáticamente. La política del sistema
        // es que el recepcionista debe confirmar la reservación manualmente. Aquí solo actualizamos
        // el estado del pago a 'pagado' y devolvemos información al cliente.

        http_response_code(200);
        echo json_encode([
            'ok' => true,
            'id_pago' => $pago['id_pago'],
            'id_reserva' => $id_reserva,
            'metodo' => $metodo,
            'monto' => $pago['monto'],
            'message' => 'Pago procesado correctamente'
        ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}
?>
