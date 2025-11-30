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

// Verificar si existe el correo
$stmt = $conn->prepare("SELECT id_usuario FROM usuarios WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $err = "Este correo ya está registrado.";
    if ($isAjax) { echo json_encode(['success' => false, 'message' => $err]); exit; }
    die($err);
}

// Insertar usuario: hasheamos la contraseña antes de guardar
$hashed = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare("INSERT INTO usuarios (email, password) VALUES (?, ?)");
$stmt->bind_param("ss", $email, $hashed);
$stmt->execute();

if ($stmt->affected_rows === 1) {
    $_SESSION['usuario'] = $conn->insert_id;
    if ($isAjax) { echo json_encode(['success' => true]); exit; }
    header("Location: ../public/index.html"); 
    exit;
}

$err = "Error al registrar usuario.";
if ($isAjax) { echo json_encode(['success' => false, 'message' => $err]); exit; }
die($err);