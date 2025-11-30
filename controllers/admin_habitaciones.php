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

// Obtener rol del usuario
$stmt = $pdo->prepare("SELECT rol FROM usuarios WHERE id_usuario = ?");
$stmt->execute([$_SESSION['usuario']]);
$user = $stmt->fetch();

if (!$user || $user['rol'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'No tienes permisos de administrador']);
    exit;
}

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? null;

    // GET - Obtener todas las habitaciones
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !$action) {
        $stmt = $pdo->prepare("
            SELECT id_habitacion, numero_habitacion, tipo, nombre_habitacion, 
                   descripcion, capacidad, precio, imagen
            FROM habitaciones
            ORDER BY numero_habitacion ASC
        ");
        $stmt->execute();
        $habitaciones = $stmt->fetchAll();

        echo json_encode([
            'ok' => true,
            'data' => $habitaciones
        ]);
        exit;
    }

    // POST - Crear habitación
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create') {
        $data = json_decode(file_get_contents('php://input'), true);

        $numero = $data['numero_habitacion'] ?? null;
        $tipo = $data['tipo'] ?? null;
        $nombre = $data['nombre_habitacion'] ?? null;
        $descripcion = $data['descripcion'] ?? '';
        $capacidad = $data['capacidad'] ?? null;
        $precio = $data['precio'] ?? null;
        $imagen = $data['imagen'] ?? null;

        if (!$numero || !$tipo || !$nombre || !$capacidad || !$precio) {
            throw new Exception('Campos requeridos faltantes');
        }

        $stmt = $pdo->prepare("
            INSERT INTO habitaciones (numero_habitacion, tipo, nombre_habitacion, descripcion, capacidad, precio, imagen)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([$numero, $tipo, $nombre, $descripcion, $capacidad, $precio, $imagen]);
        $id = $pdo->lastInsertId();

        echo json_encode([
            'ok' => true,
            'id' => $id,
            'message' => 'Habitación creada exitosamente'
        ]);
        exit;
    }

    // POST - Editar habitación
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update') {
        $data = json_decode(file_get_contents('php://input'), true);

        $id = $data['id_habitacion'] ?? null;
        $numero = $data['numero_habitacion'] ?? null;
        $tipo = $data['tipo'] ?? null;
        $nombre = $data['nombre_habitacion'] ?? null;
        $descripcion = $data['descripcion'] ?? '';
        $capacidad = $data['capacidad'] ?? null;
        $precio = $data['precio'] ?? null;
        $imagen = $data['imagen'] ?? null;

        if (!$id || !$numero || !$tipo || !$nombre || !$capacidad || !$precio) {
            throw new Exception('Campos requeridos faltantes');
        }

        $stmt = $pdo->prepare("
            UPDATE habitaciones 
            SET numero_habitacion = ?, tipo = ?, nombre_habitacion = ?, descripcion = ?, 
                capacidad = ?, precio = ?, imagen = ?
            WHERE id_habitacion = ?
        ");

        $stmt->execute([$numero, $tipo, $nombre, $descripcion, $capacidad, $precio, $imagen, $id]);

        echo json_encode([
            'ok' => true,
            'message' => 'Habitación actualizada exitosamente'
        ]);
        exit;
    }

    // DELETE - Eliminar habitación
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'delete') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id_habitacion'] ?? null;

        if (!$id) {
            throw new Exception('ID de habitación requerido');
        }

        $stmt = $pdo->prepare("DELETE FROM habitaciones WHERE id_habitacion = ?");
        $stmt->execute([$id]);

        echo json_encode([
            'ok' => true,
            'message' => 'Habitación eliminada exitosamente'
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
