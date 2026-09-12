<?php
declare(strict_types=1);

/*
 * Configuration locale XAMPP. Modifiez uniquement si votre installation
 * MariaDB utilise un mot de passe pour l'utilisateur root.
 */
return [
    'app_env' => 'local',
    'app_url' => 'http://localhost/Site-Yann',
    'contact_email' => 'lamorillecanourgaise@outlook.fr',
    'allowed_origins' => [
        'http://localhost',
        'http://127.0.0.1',
    ],
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'site_yann',
        'user' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
    ],
    'session' => [
        'name' => 'site_yann_session',
        'secure' => false,
        'same_site' => 'Lax',
    ],
    'verification_ttl_minutes' => 30,
    'password_reset_ttl_minutes' => 30,
    'expose_dev_tokens' => true,
];
