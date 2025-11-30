<?php
    $env=[];
    if(file_exists(__DIR__ . '/../.env')){
        foreach(file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line){
            if(str_starts_with(trim($line),'#')) continue;
            [$key,$value]=array_map('trim',explode('=',$line,2));
            $env[$key]=$value;
        }
    }

    return[
        'db'=>[
            'host'=>$env['DB_HOST'],
            'name'=>$env['DB_NAME'],
            'user'=>$env['DB_USER'],
            'pass'=>$env['DB_PASS'],
        ],
        'base_url'=>$env['BASE_URL'],
        'upload_dir'=> __DIR__ . '/' . ($env['UPLOAD_DIR']),
        // Mail configuration (read from .env)
        'mail' => [
            'use_smtp' => isset($env['MAIL_USE_SMTP']) ? filter_var($env['MAIL_USE_SMTP'], FILTER_VALIDATE_BOOLEAN) : false,
            'host' => $env['MAIL_HOST'] ?? 'smtp.gmail.com',
            'port' => isset($env['MAIL_PORT']) ? (int)$env['MAIL_PORT'] : 587,
            'username' => $env['MAIL_USERNAME'] ?? ($env['MAIL_USER'] ?? ''),
            'password' => $env['MAIL_PASSWORD'] ?? '',
            'secure' => $env['MAIL_SECURE'] ?? 'tls',
            'from_email' => $env['MAIL_FROM'] ?? ($env['MAIL_USERNAME'] ?? 'no-reply@localhost'),
            'from_name' => $env['MAIL_FROM_NAME'] ?? 'Reserva Hotel'
        ],
    ];
    