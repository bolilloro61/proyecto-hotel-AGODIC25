<?php
$config=require __DIR__ . '/config.php';
$conn="mysql:host={$config['db']['host']};dbname={$config['db']['name']};charset=utf8mb4";
try{
    $pdo=new PDO($conn,$config['db']['user'],$config['db']['pass'],[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    ]);
} catch(PDOException $e){
    http_response_code(500);
    echo json_encode(['ok'=>false,'message'=>'DB error','error'=>$e->getMessage()]);
    exit;
}