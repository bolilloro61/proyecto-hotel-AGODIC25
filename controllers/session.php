<?php
session_start();

$active = isset($_SESSION['usuario']) && !empty($_SESSION['usuario']);
$rol = $_SESSION['rol'] ?? 'cliente';

header('Content-Type: application/json');
echo json_encode([
    'active' => (bool)$active,
    'rol' => $rol
]);
exit;
?>