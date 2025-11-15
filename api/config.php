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
    ];
    