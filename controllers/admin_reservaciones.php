<?php
header('Content-Type: application/json');
session_start();
require_once '../api/db.php';

// Verificar que es admin o recepcionista
if (!isset($_SESSION['usuario'])) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'No autorizado']);
    exit;
}

$stmt = $pdo->prepare("SELECT rol FROM usuarios WHERE id_usuario = ?");
$stmt->execute([$_SESSION['usuario']]);
$user = $stmt->fetch();

if (!$user || ($user['rol'] !== 'administrador' && $user['rol'] !== 'recepcionista')) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'No tienes permisos']);
    exit;
}

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? null;

    // GET - Obtener todas las reservas
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !$action) {
        $stmt = $pdo->prepare("
            SELECT r.id_reserva, r.id_usuario, r.id_habitacion, r.nombre_completo, 
                   r.correo_electronico, r.telefono, r.comentarios, r.fecha_entrada, 
                   r.fecha_salida, r.estado,
                   h.numero_habitacion, h.nombre_habitacion, h.precio,
                   p.plan,
                   CONCAT_WS(', ', 
                       IF(s.piscina = 1, 'Piscina', NULL),
                       IF(s.spa = 1, 'Spa', NULL),
                       IF(s.barra_libre = 1, 'Barra Libre', NULL),
                       IF(s.comida = 1, 'Comida', NULL),
                       IF(s.desayuno = 1, 'Desayuno', NULL),
                       IF(s.cena = 1, 'Cena', NULL)
                   ) AS servicios
            FROM reservas r
            JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
            LEFT JOIN pagos p ON r.id_reserva = p.id_reserva
            LEFT JOIN servicios s ON r.id_reserva = s.id_reserva
            ORDER BY r.fecha_entrada DESC
        ");
        $stmt->execute();
        $reservas = $stmt->fetchAll();

        echo json_encode([
            'ok' => true,
            'data' => $reservas
        ]);
        exit;
    }

    // POST - Crear reserva
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create') {
        $data = json_decode(file_get_contents('php://input'), true);

        $id_habitacion = $data['id_habitacion'] ?? null;
        $nombre_completo = $data['nombre_completo'] ?? null;
        $correo = $data['correo_electronico'] ?? null;
        $telefono = $data['telefono'] ?? null;
        $fecha_entrada = $data['fecha_entrada'] ?? null;
        $fecha_salida = $data['fecha_salida'] ?? null;
        $comentarios = $data['comentarios'] ?? '';
        $estado = $data['estado'] ?? 'pendiente';
        $plan = $data['plan'] ?? 'estandar';

        if (!$id_habitacion || !$nombre_completo || !$correo || !$telefono || !$fecha_entrada || !$fecha_salida) {
            throw new Exception('Campos requeridos faltantes');
        }

        // Validar ENUM estado
        $estadosPermitidos = ['pendiente', 'confirmada', 'cancelada'];
        if (!in_array($estado, $estadosPermitidos)) {
            throw new Exception('Estado inválido');
        }

        // Validar ENUM plan
        $planesPermitidos = ['estandar', 'all_inclusive'];
        if (!in_array($plan, $planesPermitidos)) {
            throw new Exception('Plan inválido');
        }

        $admin_id = $_SESSION['usuario'];

        // Insertar reserva
        $stmt = $pdo->prepare("
            INSERT INTO reservas (id_usuario, id_habitacion, nombre_completo, correo_electronico, 
                                telefono, comentarios, fecha_entrada, fecha_salida, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([$admin_id, $id_habitacion, $nombre_completo, $correo, $telefono, 
                       $comentarios, $fecha_entrada, $fecha_salida, $estado]);

        $id_reserva = $pdo->lastInsertId();

        // Insertar pago con plan
        $stmt_pago = $pdo->prepare("
            INSERT INTO pagos (id_reserva, monto, metodo, estado, plan)
            VALUES (?, 0, NULL, 'pendiente', ?)
        ");
        $stmt_pago->execute([$id_reserva, $plan]);

        // Crear registro de servicios vacío
        $stmt_servicios = $pdo->prepare("
            INSERT INTO servicios (id_reserva, piscina, spa, barra_libre, comida, desayuno, cena)
            VALUES (?, 0, 0, 0, 0, 0, 0)
        ");
        $stmt_servicios->execute([$id_reserva]);

        echo json_encode([
            'ok' => true,
            'id' => $id_reserva,
            'message' => 'Reserva creada exitosamente'
        ]);
        exit;
    }

    // POST - Editar reserva
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update') {
        $data = json_decode(file_get_contents('php://input'), true);

        $id_reserva = $data['id_reserva'] ?? null;
        $nombre_completo = $data['nombre_completo'] ?? null;
        $correo = $data['correo_electronico'] ?? null;
        $telefono = $data['telefono'] ?? null;
        $fecha_entrada = $data['fecha_entrada'] ?? null;
        $fecha_salida = $data['fecha_salida'] ?? null;
        $comentarios = $data['comentarios'] ?? '';
        $estado = $data['estado'] ?? 'pendiente';

        if (!$id_reserva || !$nombre_completo || !$correo || !$telefono || !$fecha_entrada || !$fecha_salida) {
            throw new Exception('Campos requeridos faltantes');
        }

        $estadosPermitidos = ['pendiente', 'confirmada', 'cancelada'];
        if (!in_array($estado, $estadosPermitidos)) {
            throw new Exception('Estado inválido');
        }

        $stmt = $pdo->prepare("
            UPDATE reservas 
            SET nombre_completo = ?, correo_electronico = ?, telefono = ?, comentarios = ?,
                fecha_entrada = ?, fecha_salida = ?, estado = ?
            WHERE id_reserva = ?
        ");

        $stmt->execute([$nombre_completo, $correo, $telefono, $comentarios, 
                       $fecha_entrada, $fecha_salida, $estado, $id_reserva]);

        echo json_encode([
            'ok' => true,
            'message' => 'Reserva actualizada exitosamente'
        ]);
        exit;
    }

    // POST - Actualizar plan y servicios de una reserva
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_servicios') {
        $data = json_decode(file_get_contents('php://input'), true);

        $id_reserva = $data['id_reserva'] ?? null;
        $plan = $data['plan'] ?? 'estandar';
        $servicios = $data['servicios'] ?? [];

        if (!$id_reserva) {
            throw new Exception('ID de reserva requerido');
        }

        $planesPermitidos = ['estandar', 'all_inclusive'];
        if (!in_array($plan, $planesPermitidos)) {
            throw new Exception('Plan inválido');
        }

        // Actualizar plan en pagos
        $stmt = $pdo->prepare("UPDATE pagos SET plan = ? WHERE id_reserva = ?");
        $stmt->execute([$plan, $id_reserva]);

        echo json_encode([
            'ok' => true,
            'message' => 'Plan y servicios actualizados exitosamente',
            'plan' => $plan,
            'servicios' => $servicios
        ]);
        exit;
    }

    // DELETE - Cancelar reserva (solo admin/recepcionista)
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'cancel') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id_reserva = $data['id_reserva'] ?? null;

        if (!$id_reserva) {
            throw new Exception('ID de reserva requerido');
        }

        // Obtener reserva para validar fecha de check-in
        $stmt_get = $pdo->prepare("SELECT fecha_entrada, estado FROM reservas WHERE id_reserva = ?");
        $stmt_get->execute([$id_reserva]);
        $res = $stmt_get->fetch(PDO::FETCH_ASSOC);

        if (!$res) {
            throw new Exception('Reserva no encontrada');
        }

        $fecha_entrada = new DateTime($res['fecha_entrada']);
        $ahora = new DateTime('now');

        if ($ahora >= $fecha_entrada) {
            throw new Exception('No se puede cancelar una reserva después del check-in');
        }

        // Cancelar pagos y reserva en transacción
        $pdo->beginTransaction();
        try {
            // Marcar pagos asociados como 'fallido' y mantener el campo 'metodo' intacto
            $stmt_cancel_pagos = $pdo->prepare("UPDATE pagos SET estado = 'fallido' WHERE id_reserva = ?");
            $stmt_cancel_pagos->execute([$id_reserva]);

            $stmt_cancel = $pdo->prepare("UPDATE reservas SET estado = 'cancelada' WHERE id_reserva = ?");
            $stmt_cancel->execute([$id_reserva]);

            $pdo->commit();
        } catch (Exception $inner) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $inner;
        }

        echo json_encode([
            'ok' => true,
            'message' => 'Reserva y pagos cancelados exitosamente'
        ]);
        exit;
    }

    // GET - Obtener estadísticas dashboard
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'stats') {
        // Total habitaciones
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM habitaciones");
        $stmt->execute();
        $total_habitaciones = $stmt->fetch()['total'];

        // Total reservas
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM reservas");
        $stmt->execute();
        $total_reservas = $stmt->fetch()['total'];

        // Reservas pendientes
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM reservas WHERE estado = 'pendiente'");
        $stmt->execute();
        $reservas_pendientes = $stmt->fetch()['total'];

        // Ingresos totales (pagos pagados)
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE estado = 'pagado'");
        $stmt->execute();
        $ingresos_totales = $stmt->fetch()['total'];

        echo json_encode([
            'ok' => true,
            'stats' => [
                'total_habitaciones' => $total_habitaciones,
                'total_reservas' => $total_reservas,
                'reservas_pendientes' => $reservas_pendientes,
                'ingresos_totales' => $ingresos_totales
            ]
        ]);
        exit;
    }

    throw new Exception('Acción no válida');

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}
?>
