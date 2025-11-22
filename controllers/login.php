<?php
session_start();

$host = "localhost:8889";
$user = "root";
$pass = "root";
$dbname = "hotel";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    $msg = "Error de conexión: " . $conn->connect_error;
    $isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    if ($isAjax) { echo json_encode(['success' => false, 'message' => $msg]); exit; }
    die($msg);
}

$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');

$isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';

if ($email === '' || $password === '') {
    $err = "Todos los campos son obligatorios.";
    if ($isAjax) { echo json_encode(['success' => false, 'message' => $err]); exit; }
    die($err);
}

// Obtener usuario
$stmt = $conn->prepare("SELECT id_usuario, password FROM usuarios WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows === 0) {
    $err = "Correo no registrado.";
    if ($isAjax) { echo json_encode(['success' => false, 'message' => $err]); exit; }
    die($err);
}

$stmt->bind_result($id_usuario, $pass_db);
$stmt->fetch();

// Soportar contraseñas hasheadas y sin hashear (migración gradual)
$login_ok = false;
if (!empty($pass_db) && password_verify($password, $pass_db)) {
    $login_ok = true;
} elseif ($password === $pass_db) {
    // Contraseña almacenada en texto plano: aceptar, y actualizar a hash
    $login_ok = true;
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $upd = $conn->prepare("UPDATE usuarios SET password = ? WHERE id_usuario = ?");
    if ($upd) {
        $upd->bind_param("si", $newHash, $id_usuario);
        $upd->execute();
        $upd->close();
    }
}

if (!$login_ok) {
    $err = "Contraseña incorrecta.";
    if ($isAjax) { echo json_encode(['success' => false, 'message' => $err]); exit; }
    die($err);
}

$_SESSION['usuario'] = $id_usuario;

if ($isAjax) {
    echo json_encode(['success' => true]);
    exit;
}

header("Location: ../public/index.html");
exit;
