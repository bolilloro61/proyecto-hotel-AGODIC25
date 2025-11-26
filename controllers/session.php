<?php
session_start();

$active = isset($_SESSION['usuario']) && !empty($_SESSION['usuario']);

header('Content-Type: application/json');
echo json_encode(['active' => (bool)$active]);
exit;