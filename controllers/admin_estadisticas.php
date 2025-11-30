<?php
header('Content-Type: application/json');
session_start();
require_once '../api/db.php';

// Verificar que es admin
if (!isset($_SESSION['usuario'])) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'No autorizado']);
    exit;
}

$stmt = $pdo->prepare("SELECT rol FROM usuarios WHERE id_usuario = ?");
$stmt->execute([$_SESSION['usuario']]);
$user = $stmt->fetch();

if (!$user || $user['rol'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'No tienes permisos']);
    exit;
}

try {
    // Total de usuarios
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM usuarios");
    $stmt->execute();
    $total_usuarios = $stmt->fetch()['total'];

    // Obtener lista de usuarios con sus reservaciones
    $stmt = $pdo->prepare("
        SELECT u.id_usuario, u.email, u.rol, COUNT(r.id_reserva) as total_reservaciones
        FROM usuarios u
        LEFT JOIN reservas r ON u.id_usuario = r.id_usuario
        GROUP BY u.id_usuario, u.email, u.rol
        ORDER BY u.id_usuario ASC
    ");
    $stmt->execute();
    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Usuarios por rol (para dashboard)
    $stmt = $pdo->prepare("
        SELECT rol, COUNT(*) as cantidad 
        FROM usuarios 
        GROUP BY rol
    ");
    $stmt->execute();
    $usuarios_por_rol = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ocupación actual
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total FROM reservas 
        WHERE estado = 'confirmada' 
        AND fecha_entrada <= CURDATE() 
        AND fecha_salida >= CURDATE()
    ");
    $stmt->execute();
    $ocupacion_actual = $stmt->fetch()['total'];

    // Tasa de ocupación
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM habitaciones");
    $stmt->execute();
    $total_habitaciones = $stmt->fetch()['total'];
    $tasa_ocupacion = $total_habitaciones > 0 ? round(($ocupacion_actual / $total_habitaciones) * 100, 2) : 0;

    // Revenue promedio por reserva
    $stmt = $pdo->prepare("
        SELECT AVG(monto) as promedio 
        FROM pagos 
        WHERE estado = 'pagado'
    ");
    $stmt->execute();
    $revenue_promedio = $stmt->fetch()['promedio'] ?? 0;

    // Últimas transacciones
    $stmt = $pdo->prepare("
        SELECT p.id_pago, p.monto, p.fecha_pago, p.estado, r.nombre_completo, h.numero_habitacion
        FROM pagos p
        JOIN reservas r ON p.id_reserva = r.id_reserva
        JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
        ORDER BY p.fecha_pago DESC
        LIMIT 10
    ");
    $stmt->execute();
    $ultimas_transacciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'total_usuarios' => $total_usuarios,
        'usuarios' => $usuarios,
        'usuarios_por_rol' => $usuarios_por_rol,
        'ocupacion_actual' => $ocupacion_actual,
        'tasa_ocupacion' => $tasa_ocupacion,
        'total_habitaciones' => $total_habitaciones,
        'revenue_promedio' => round($revenue_promedio, 2),
        'ultimas_transacciones' => $ultimas_transacciones
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}
?>
