<?php
header('Content-Type: application/json');
session_start();
require_once '../api/db.php';
// Cargar configuración de la aplicación (incluye opciones de mail)
$appConfig = require __DIR__ . '/../api/config.php';

try {
    $datos = json_decode(file_get_contents('php://input'), true);
    $id_reserva = $datos['id_reserva'] ?? null;

    if (!$id_reserva) {
        throw new Exception('ID de reservación requerido');
    }

    // Obtener la reservación
    $stmt = $pdo->prepare("SELECT r.*, h.numero_habitacion
        FROM reservas r
        JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
        WHERE r.id_reserva = ?");
    $stmt->execute([$id_reserva]);
    $reserva = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reserva) {
        throw new Exception('Reservación no encontrada');
    }

    // Requerir sesión
    if (!isset($_SESSION['usuario'])) {
        http_response_code(403);
        throw new Exception('No autorizado');
    }

    // Obtener rol del usuario en sesión
    $stmt_user = $pdo->prepare("SELECT id_usuario, rol FROM usuarios WHERE id_usuario = ?");
    $stmt_user->execute([$_SESSION['usuario']]);
    $usuarioSesion = $stmt_user->fetch(PDO::FETCH_ASSOC);
    $rol = $usuarioSesion['rol'] ?? 'cliente';
    $esStaff = in_array($rol, ['administrador', 'recepcionista']);

    // Si no es staff, el usuario debe ser propietario de la reserva
    if (!$esStaff && $reserva['id_usuario'] != $_SESSION['usuario']) {
        http_response_code(403);
        throw new Exception('No autorizado para cancelar esta reservación');
    }

    // Verificar estado actual
    if ($reserva['estado'] === 'cancelada') {
        throw new Exception('La reservación ya está cancelada');
    }

    $fecha_entrada = new DateTime($reserva['fecha_entrada']);
    $ahora = new DateTime('now');

    // No permitir cancelar después del check-in
    if ($ahora >= $fecha_entrada) {
        throw new Exception('No se puede cancelar después del check-in');
    }

    // Si es cliente regular, aplicar regla de 48 horas
    if (!$esStaff) {
        $segundosRestantes = $fecha_entrada->getTimestamp() - $ahora->getTimestamp();
        if ($segundosRestantes < (48 * 3600)) {
            throw new Exception('No puedes cancelar menos de 48 horas antes del check-in');
        }
    }

    // Cancelar pagos y la reserva en una transacción
    $pdo->beginTransaction();

    // Marcar pagos asociados como fallidos; no tocamos el campo 'metodo'
    $stmt_cancel_pagos = $pdo->prepare("UPDATE pagos SET estado = 'fallido' WHERE id_reserva = ?");
    $stmt_cancel_pagos->execute([$id_reserva]);

    // Actualizar estado de la reserva
    $stmt_cancel = $pdo->prepare("UPDATE reservas SET estado = 'cancelada' WHERE id_reserva = ?");
    $stmt_cancel->execute([$id_reserva]);

    $pdo->commit();

    // Enviar correo de notificación de cancelación al usuario
    try {
        $to = filter_var($reserva['correo_electronico'] ?? null, FILTER_VALIDATE_EMAIL) ?: null;
        if ($to) {
            $subject = "Cancelación de Reserva #{$id_reserva}";
            $html = "<html><body>";
            $html .= "<h2>Reserva Cancelada (#{$id_reserva})</h2>";
            $html .= "<p>Hola " . htmlspecialchars($reserva['nombre_completo'] ?? '') . ",</p>";
            $html .= "<p>Te informamos que tu reserva para la habitación <strong>" . htmlspecialchars($reserva['numero_habitacion'] ?? '') . "</strong> con fecha de entrada <strong>" . htmlspecialchars($reserva['fecha_entrada']) . "</strong> ha sido cancelada.</p>";
            $html .= "<p>Si crees que esto es un error o necesitas asistencia, por favor contacta con la recepción.</p>";
            $html .= "<p>Saludos,<br/>El equipo de hotel Hotel</p>";
            $html .= "</body></html>";

            $sent = false;
            $mailConfig = $appConfig['mail'] ?? [];
            $fromEmail = $mailConfig['from_email'] ?? 'no-reply@localhost';
            $fromName = $mailConfig['from_name'] ?? 'Reserva Hotel';

            if (!empty($mailConfig['use_smtp'])) {
                $autoload = __DIR__ . '/../vendor/autoload.php';
                if (file_exists($autoload)) {
                    try {
                        require_once $autoload;
                        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                        $mail->isSMTP();
                        $mail->Host = $mailConfig['host'] ?? 'smtp.gmail.com';
                        $mail->SMTPAuth = true;
                        $mail->Username = $mailConfig['username'] ?? '';
                        $mail->Password = $mailConfig['password'] ?? '';
                        $mail->SMTPSecure = ($mailConfig['secure'] ?? 'tls');
                        $mail->Port = (int)($mailConfig['port'] ?? 587);
                        $mail->CharSet = 'UTF-8';
                        $mail->setFrom($fromEmail, $fromName);
                        $mail->addAddress($to);
                        $mail->isHTML(true);
                        $mail->Subject = $subject;
                        $mail->Body = $html;
                        $mail->AltBody = trim(strip_tags(str_replace(array("\n", "<br>", "<br/>", "</p>"), "\n", $html)));
                        $sent = (bool)$mail->send();
                        if (!$sent) {
                            @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - cancelar_reservacion: PHPMailer->send() returned false for {$to} - reserva {$id_reserva}\n", FILE_APPEND);
                        }
                    } catch (Exception $ex) {
                        @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - cancelar_reservacion: PHPMailer exception: " . $ex->getMessage() . "\n", FILE_APPEND);
                        $sent = false;
                    }
                } else {
                    @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - cancelar_reservacion: vendor/autoload.php not found, install PHPMailer via composer\n", FILE_APPEND);
                }
            }

            if (!$sent) {
                $headers = "From: " . $fromName . " <" . $fromEmail . ">\r\n";
                $headers .= "MIME-Version: 1.0\r\n";
                $headers .= "Content-type: text/html; charset=utf-8\r\n";
                $fallback = @mail($to, $subject, $html, $headers);
                if (!$fallback) {
                    @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - cancelar_reservacion: mail() fallback failed for {$to} - reserva {$id_reserva}\n", FILE_APPEND);
                }
            }
        } else {
            @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - cancelar_reservacion: invalid email for reserva {$id_reserva}: " . json_encode($reserva['correo_electronico'] ?? null) . "\n", FILE_APPEND);
        }
    } catch (Exception $e) {
        @file_put_contents(__DIR__ . '/../logs/error_log.txt', date('c') . " - cancelar_reservacion: mail exception: " . $e->getMessage() . "\n", FILE_APPEND);
    }

    echo json_encode([
        'ok' => true,
        'message' => 'Reservación y pagos cancelados exitosamente',
        'usuario_id' => $reserva['id_usuario']
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Log error to a temporary file to help debugging in local MAMP
    error_log(date('[Y-m-d H:i:s] ') . "cancelar_reservacion error: " . $e->getMessage() . "\n", 3, __DIR__ . '/../logs/error_log.txt');

    http_response_code($e->getCode() === 403 ? 403 : 400);
    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
    ]);
}

