<?php
declare(strict_types=1);

/*
 * Copiez ce fichier vers api/config.php et adaptez uniquement les valeurs
 * de votre installation XAMPP. Ne commitez jamais api/config.php.
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
        'user' => 'CHANGE_ME',
        'password' => 'CHANGE_ME',
        'charset' => 'utf8mb4',
    ],
    'session' => [
        'name' => 'site_yann_session',
        'secure' => false,
        'same_site' => 'Lax',
    ],
    'verification_ttl_minutes' => 30,
    'password_reset_ttl_minutes' => 30,
    /*
     * En local uniquement, les endpoints peuvent renvoyer le code de
     * vérification pour faciliter les tests sans serveur SMTP.
     */
    'expose_dev_tokens' => true,
];
