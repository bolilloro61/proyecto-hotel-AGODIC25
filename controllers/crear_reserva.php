<?php
// Mostrar errores temporalmente para debugging local (quita en producción)
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../api/db.php';
// Cargar configuración (incluye opciones de mail desde .env)
$appConfig = require __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/helpers.php';

try {
    // Leer y decodificar JSON del body
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Datos inválidos o vacíos');
    }

    // Extraer datos
    $habitacionId = $data['habitacion']['id_habitacion'] ?? null;
    $fechaEntrada = $data['fechaEntrada'] ?? null;
    $fechaSalida = $data['fechaSalida'] ?? null;
    $nombre = $data['nombre'] ?? null;
    $email = $data['email'] ?? null;
    $telefono = $data['telefono'] ?? null;
    $comentarios = $data['comentarios'] ?? '';
    $plan = $data['plan'] ?? 'estandar';
    $servicios = $data['servicios'] ?? [];

    // Validaciones básicas
    $planesPermitidos = ['estandar', 'all_inclusive'];
    if (!in_array($plan, $planesPermitidos)) {
        throw new Exception('Plan inválido. Debe ser: estandar o all_inclusive');
    }
    if (!$habitacionId || !$fechaEntrada || !$fechaSalida || !$nombre || !$email || !$telefono) {
        throw new Exception('Campos requeridos faltantes');
    }

    // Validación de fechas
    $fechaEntradaObj = DateTime::createFromFormat('Y-m-d', $fechaEntrada);
    $fechaSalidaObj = DateTime::createFromFormat('Y-m-d', $fechaSalida);
    if (!$fechaEntradaObj || !$fechaSalidaObj) {
        throw new Exception('Formato de fecha inválido');
    }
    $hoy = new DateTime('today');
    if ($fechaEntradaObj < $hoy) {
        throw new Exception('La fecha de entrada no puede ser en el pasado');
    }
    if ($fechaSalidaObj <= $fechaEntradaObj) {
        throw new Exception('La fecha de salida debe ser posterior a la de entrada');
    }

    // Obtener usuario desde sesión
    session_start();
    $usuarioId = $_SESSION['usuario'] ?? 1;

    // Verificar disponibilidad
    $stmt_check = $pdo->prepare("SELECT COUNT(*) as conflictos FROM reservas r WHERE r.id_habitacion = ? AND r.estado != 'cancelada' AND ((r.fecha_entrada < ? AND r.fecha_salida > ?) OR (r.fecha_entrada = ? AND r.fecha_salida = ?))");
    $stmt_check->execute([$habitacionId, $fechaSalida, $fechaEntrada, $fechaEntrada, $fechaSalida]);
    $resultado = $stmt_check->fetch();
    if ($resultado['conflictos'] > 0) {
        throw new Exception('La habitación no está disponible en estas fechas');
    }

    // Insertar reserva
    $stmt = $pdo->prepare("INSERT INTO reservas (id_usuario, id_habitacion, nombre_completo, correo_electronico, telefono, comentarios, fecha_entrada, fecha_salida, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')");
    $success = $stmt->execute([$usuarioId, $habitacionId, $nombre, $email, $telefono, $comentarios, $fechaEntrada, $fechaSalida]);
    if (!$success) {
        $errorInfo = $stmt->errorInfo();
        throw new Exception('Error al insertar reserva: ' . ($errorInfo[2] ?? 'Desconocido'));
    }
    $reservaId = $pdo->lastInsertId();

    // Insertar pago (monto lo calculará un trigger en la BD si existe)
    $pagoData = $data['pago'] ?? null;
    $metodoPago = $pagoData['metodo'] ?? null;
    $estadoPago = 'pendiente';
    if ($metodoPago && in_array($metodoPago, ['tarjeta', 'paypal'])) {
        $estadoPago = 'pagado';
    }

    // Normalizar valor de plan para la columna en la BD (evitar insertar valores no permitidos por ENUM)
    $plan_db = ($plan === 'all_inclusive') ? 'all_inclusive' : 'estandar';

    // Verificar dinámicamente qué valores permite el ENUM en la BD para evitar warnings (SQLSTATE 1265)
    try {
        $stmtEnum = $pdo->prepare("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos' AND COLUMN_NAME = 'plan' LIMIT 1");
        $stmtEnum->execute();
        $col = $stmtEnum->fetchColumn();
        if ($col) {
            // columna viene como: enum('estandar','all_inclusive') => extraer valores
            if (preg_match("/^enum\\((.*)\\)$/", $col, $m)) {
                $inside = $m[1];
                $parts = array_map(function($v){ return trim($v, "'\""); }, explode(',', $inside));
                if (!in_array($plan_db, $parts, true)) {
                    // Log mismatch
                    @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva: plan_db '" . $plan_db . "' not in pagos.plan ENUM; allowed: " . json_encode($parts) . "\n", FILE_APPEND);

                    // Intentar mapear a un literal que represente el plan 'normal' (no all_inclusive)
                    $candidates = $parts;
                    $mapped = null;
                    // Preferir cualquier valor que NO contenga 'all' o 'inclusive'
                    foreach ($candidates as $cand) {
                        $low = strtolower($cand);
                        if (strpos($low, 'all') === false && strpos($low, 'inclusive') === false) {
                            $mapped = $cand;
                            break;
                        }
                    }
                    // Si no encontramos uno claro, buscar coincidencias comunes (english/spanish)
                    if ($mapped === null) {
                        $fallbackNames = ['estandar','standard','normal','basico','basico'];
                        foreach ($fallbackNames as $fn) {
                            foreach ($candidates as $cand) {
                                if (stripos($cand, $fn) !== false) {
                                    $mapped = $cand;
                                    break 2;
                                }
                            }
                        }
                    }

                    // Si todavía no hay mapeo, tomar el primer valor permitido (último recurso)
                    if ($mapped === null) {
                        $mapped = $parts[0] ?? $plan_db;
                    }

                    $plan_db = $mapped;
                }
            }
        }
    } catch (Exception $ex) {
        // No bloquear la reserva por este chequeo; si falla, seguiremos con $plan_db tal cual
        @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva enum check failed: " . $ex->getMessage() . "\n", FILE_APPEND);
    }

    // Si por alguna razón el plan que guardaremos indica 'all_inclusive' pero el usuario seleccionó otro,
    // dejar un registro para investigar inconsistencia (no cambiamos la selección de servicios del usuario).
    if (stripos($plan_db, 'all') !== false && $plan !== 'all_inclusive') {
        @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva: plan_db resolved to '" . $plan_db . "' but user selected '" . $plan . "' - servicios will follow user selection.\n", FILE_APPEND);
    }

    if ($metodoPago === null || $metodoPago === '') {
        $stmtPago = $pdo->prepare("INSERT INTO pagos (id_reserva, monto, metodo, estado, plan) VALUES (?, ?, NULL, ?, ?)");
        $successPago = $stmtPago->execute([$reservaId, 0, $estadoPago, $plan_db]);
    } else {
        $stmtPago = $pdo->prepare("INSERT INTO pagos (id_reserva, monto, metodo, estado, plan) VALUES (?, ?, ?, ?, ?)");
        $successPago = $stmtPago->execute([$reservaId, 0, $metodoPago, $estadoPago, $plan_db]);
    }

    if (empty($successPago)) {
        $err = $stmtPago->errorInfo();
        // Log local para debugging
        @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva pagos insert error: " . json_encode($err) . " plan_db: $plan_db\n", FILE_APPEND);
        throw new Exception('Error al insertar pago: ' . ($err[2] ?? 'Desconocido'));
    }

    $idPago = $pdo->lastInsertId();
    $stmtPagoInfo = $pdo->prepare("SELECT id_pago, id_reserva, monto, metodo, estado, plan FROM pagos WHERE id_pago = ?");
    $stmtPagoInfo->execute([$idPago]);
    $pagoInfo = $stmtPagoInfo->fetch(PDO::FETCH_ASSOC);

    // Guardar flags de servicios en la tabla `servicios` (si existe)
    // Columnas esperadas: piscina, spa, barra_libre, comida, desayuno, cena
    $mapa = [
        'piscina' => 0,
        'spa' => 0,
        'barra_libre' => 0,
        'comida' => 0,
        'desayuno' => 0,
        'cena' => 0
    ];

    // Si el plan es all_inclusive, marcar todo 1
    if ($plan === 'all_inclusive') {
        foreach ($mapa as $k => $_) $mapa[$k] = 1;
    } else {
        // Mapear a partir del array enviado por el cliente (si viene)
        if (is_array($servicios)) {
            foreach ($servicios as $s) {
                $nombre = $s['nombre'] ?? null;
                $incluido = isset($s['incluido']) ? intval($s['incluido']) : (isset($s['included']) ? intval($s['included']) : 0);
                if ($nombre && array_key_exists($nombre, $mapa)) {
                    $mapa[$nombre] = $incluido ? 1 : 0;
                }
            }
        }
    }

    // Intentar insertar o actualizar fila en `servicios`
    // Primero verificar si ya existe (por seguridad)
    $stmtCheckServicios = $pdo->prepare("SELECT id_servicio FROM servicios WHERE id_reserva = ? LIMIT 1");
    $stmtCheckServicios->execute([$reservaId]);
    $existeServicios = $stmtCheckServicios->fetchColumn();

    if ($existeServicios) {
        $stmtServUpd = $pdo->prepare("UPDATE servicios SET piscina = ?, spa = ?, barra_libre = ?, comida = ?, desayuno = ?, cena = ? WHERE id_reserva = ?");
        $stmtServUpd->execute([$mapa['piscina'], $mapa['spa'], $mapa['barra_libre'], $mapa['comida'], $mapa['desayuno'], $mapa['cena'], $reservaId]);
    } else {
        $stmtServIns = $pdo->prepare("INSERT INTO servicios (id_reserva, piscina, spa, barra_libre, comida, desayuno, cena) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmtServIns->execute([$reservaId, $mapa['piscina'], $mapa['spa'], $mapa['barra_libre'], $mapa['comida'], $mapa['desayuno'], $mapa['cena']]);
    }

    // Generar código de acceso único para la reserva (ej: 8 hex chars)
    try {
        $access_code = strtoupper(bin2hex(random_bytes(4)));
    } catch (Exception $e) {
        // fallback
        $access_code = strtoupper(substr(md5(uniqid((string)microtime(true), true)), 0, 8));
    }

    // Intentar guardar código en la tabla `reservas` si existe columna `codigo_acceso`
    try {
        $stmtCol = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservas' AND COLUMN_NAME = 'codigo_acceso'");
        $stmtCol->execute();
        $hasCol = (int)$stmtCol->fetchColumn() > 0;
        if ($hasCol) {
            $stmtUpdCode = $pdo->prepare("UPDATE reservas SET codigo_acceso = ? WHERE id_reserva = ?");
            $stmtUpdCode->execute([$access_code, $reservaId]);
        } else {
            @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva: reservas.codigo_acceso column not found. Suggested SQL: ALTER TABLE reservas ADD COLUMN codigo_acceso VARCHAR(64) NULL;\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva: failed saving access_code: " . $e->getMessage() . "\n", FILE_APPEND);
    }

    // Intentar guardar código también en la tabla `servicios` si existe la columna `codigo_acceso`
    try {
        $stmtColServ = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios' AND COLUMN_NAME = 'codigo_acceso'");
        $stmtColServ->execute();
        $hasServCol = (int)$stmtColServ->fetchColumn() > 0;
        if ($hasServCol) {
            $stmtUpdServCode = $pdo->prepare("UPDATE servicios SET codigo_acceso = ? WHERE id_reserva = ?");
            $stmtUpdServCode->execute([$access_code, $reservaId]);
        } else {
            @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva: servicios.codigo_acceso column not found. Suggested SQL: ALTER TABLE servicios ADD COLUMN codigo_acceso VARCHAR(64) NULL AFTER fecha_creacion;\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - crear_reserva: failed saving access_code to servicios: " . $e->getMessage() . "\n", FILE_APPEND);
    }

    // Preparar y enviar correo de confirmación (usar helper send_mail_from_config)
    $to = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    $subject = "Confirmación de Reserva #{$reservaId}";

    // Construir lista de servicios legible
    $servList = [];
    foreach ($mapa as $k => $v) {
        if ($v) {
            $label = str_replace('_', ' ', $k);
            $label = ucfirst($label);
            $servList[] = $label;
        }
    }
    $serviciosTxt = count($servList) ? implode(', ', $servList) : 'Ninguno';

    $monto = isset($pagoInfo['monto']) ? $pagoInfo['monto'] : 0;

    $html = "<html><body>";
    $html .= "<h2>Confirmación de Reserva #{$reservaId}</h2>";
    $html .= "<p>Hola " . htmlspecialchars($nombre) . ",</p>";
    $html .= "<p>Gracias por tu reserva. A continuación los detalles:</p>";
    $html .= "<ul>";
    $html .= "<li><strong>Habitación ID:</strong> " . htmlspecialchars($habitacionId) . "</li>";
    $html .= "<li><strong>Fechas:</strong> " . htmlspecialchars($fechaEntrada) . " → " . htmlspecialchars($fechaSalida) . "</li>";
    $html .= "<li><strong>Plan:</strong> " . htmlspecialchars($plan_db) . "</li>";
    $html .= "<li><strong>Servicios adicionales:</strong> " . htmlspecialchars($serviciosTxt) . "</li>";
    $html .= "<li><strong>Monto:</strong> $" . number_format((float)$monto, 2) . "</li>";
    $html .= "</ul>";
    $html .= "<p><strong>Código de acceso:</strong> <span style='font-size:1.2rem;color:#c41e3a;'>" . htmlspecialchars($access_code) . "</span></p>";
    $html .= "<p>Presenta este código en la recepción para acceder a los servicios contratados.</p>";
    $html .= "<p>Saludos,<br/>El equipo de hotel Hotel</p>";
    $html .= "</body></html>";

    if (!send_mail_from_config($appConfig, $to, $subject, $html)) {
        app_log("crear_reserva: failed to send confirmation email to {$to} for reserva {$reservaId}");
    }

    // Responder correctamente con JSON limpio
    http_response_code(200);
    echo json_encode([
        'ok' => true,
        'reserva_id' => $reservaId,
        // Devolver el plan normalizado que se guardó en la BD
        'plan' => $plan_db,
        'servicios' => $mapa,
        'monto' => $pagoInfo['monto'] ?? 0,
        'pago' => $pagoInfo,
        'message' => 'Reserva creada correctamente'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
}
?>

