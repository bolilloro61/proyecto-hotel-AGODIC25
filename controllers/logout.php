<?php
session_start();
session_destroy();

$isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
if ($isAjax) {
	echo json_encode(['success' => true]);
	exit;
}

// Fallback: redirect to public login
header("Location: ../public/login.html");
exit;
