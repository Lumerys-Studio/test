<?php
declare(strict_types=1);

$configFile = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'CONFIGURATION_MISSING',
            'message' => 'Copiez api/config.example.php vers api/config.php puis configurez MariaDB.',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$config = require $configFile;
if (!is_array($config)) {
    throw new RuntimeException('La configuration PHP doit retourner un tableau.');
}

date_default_timezone_set((string)($config['timezone'] ?? 'Europe/Paris'));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = array_values(array_filter(
    $config['allowed_origins'] ?? [],
    static fn ($value): bool => is_string($value) && $value !== ''
));
$originIsAllowed = $origin !== '' && (
    in_array($origin, $allowedOrigins, true)
    || preg_match('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$#', $origin) === 1
);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($originIsAllowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
} elseif ($origin !== '') {
    json_response(['success' => false, 'error' => [
        'code' => 'CORS_ORIGIN_DENIED',
        'message' => 'Origine locale non autorisée.',
    ]    ], 403);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$sessionConfig = $config['session'] ?? [];
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name((string)($sessionConfig['name'] ?? 'site_yann_session'));
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => (bool)($sessionConfig['secure'] ?? false),
    'httponly' => true,
    'samesite' => (string)($sessionConfig['same_site'] ?? 'Lax'),
]);
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ok(array $data = [], int $status = 200): never
{
    json_response(['success' => true] + $data, $status);
}

function fail(string $code, string $message, int $status = 400, array $details = []): never
{
    $error = ['code' => $code, 'message' => $message];
    if ($details !== []) {
        $error['details'] = $details;
    }
    json_response(['success' => false, 'error' => $error], $status);
}

function request_method(string ...$allowed): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? '');
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        fail('METHOD_NOT_ALLOWED', 'Méthode HTTP non autorisée.', 405);
    }
}

function input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    if (strlen($raw) > 1_048_576) {
        fail('PAYLOAD_TOO_LARGE', 'La requête est trop volumineuse.', 413);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('INVALID_JSON', 'Le corps doit être un objet JSON valide.', 400);
    }
    return $data;
}

function required_string(array $data, string $key, int $maxLength = 255): string
{
    $value = $data[$key] ?? null;
    if (!is_string($value) || trim($value) === '') {
        fail('VALIDATION_ERROR', 'Le champ « ' . $key . ' » est obligatoire.', 422, [$key => 'required']);
    }
    $value = trim($value);
    if (mb_strlen($value) > $maxLength) {
        fail('VALIDATION_ERROR', 'Le champ « ' . $key . ' » est trop long.', 422, [$key => 'max_length']);
    }
    return $value;
}

function optional_string(array $data, string $key, int $maxLength = 255): ?string
{
    if (!array_key_exists($key, $data) || $data[$key] === null || $data[$key] === '') {
        return null;
    }
    if (!is_string($data[$key])) {
        fail('VALIDATION_ERROR', 'Le champ « ' . $key . ' » est invalide.', 422, [$key => 'string']);
    }
    $value = trim($data[$key]);
    if (mb_strlen($value) > $maxLength) {
        fail('VALIDATION_ERROR', 'Le champ « ' . $key . ' » est trop long.', 422, [$key => 'max_length']);
    }
    return $value === '' ? null : $value;
}

function email_value(array $data, string $key = 'email'): string
{
    $email = mb_strtolower(required_string($data, $key, 254));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail('VALIDATION_ERROR', 'Adresse email invalide.', 422, [$key => 'email']);
    }
    return $email;
}

function password_value(array $data, string $key = 'password'): string
{
    $password = $data[$key] ?? null;
    if (!is_string($password) || strlen($password) < 8 || strlen($password) > 72) {
        fail('VALIDATION_ERROR', 'Le mot de passe doit contenir entre 8 et 72 caractères.', 422, [$key => 'length']);
    }
    return $password;
}

function db(): PDO
{
    static $pdo = null;
    global $config;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $db = $config['db'] ?? [];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'] ?? '127.0.0.1',
        (int)($db['port'] ?? 3306),
        $db['name'] ?? '',
        $db['charset'] ?? 'utf8mb4'
    );
    try {
        $pdo = new PDO($dsn, (string)($db['user'] ?? ''), (string)($db['password'] ?? ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $exception) {
        error_log('Database connection failed: ' . $exception->getMessage());
        fail('DATABASE_UNAVAILABLE', 'La base de données est momentanément indisponible.', 503);
    }
    return $pdo;
}

function token_hash(string $token): string
{
    return hash('sha256', $token);
}

function random_token(): string
{
    return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
}

function verification_code(): string
{
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function current_user(): ?array
{
    if (!isset($_SESSION['user_id']) || !is_int($_SESSION['user_id'])) {
        return null;
    }
    $statement = db()->prepare(
        'SELECT id, email, full_name, phone, email_verified_at, created_at, updated_at
         FROM users WHERE id = :id AND status = "active" LIMIT 1'
    );
    $statement->execute(['id' => $_SESSION['user_id']]);
    $user = $statement->fetch();
    return $user ?: null;
}

function require_user(): array
{
    $user = current_user();
    if ($user === null) {
        fail('AUTHENTICATION_REQUIRED', 'Vous devez être connecté.', 401);
    }
    return $user;
}

function public_user(array $user): array
{
    return [
        'id' => (int)$user['id'],
        'email' => $user['email'],
        'name' => $user['full_name'],
        'phone' => $user['phone'],
        'email_verified' => $user['email_verified_at'] !== null,
        'created_at' => $user['created_at'],
    ];
}

function address_payload(array $address): array
{
    return [
        'id' => (int)$address['id'],
        'street_number' => $address['street_number'],
        'street' => $address['street'],
        'postal_code' => $address['postal_code'],
        'city' => $address['city'],
        'country' => $address['country'],
        'is_default' => (bool)$address['is_default'],
    ];
}

function dev_token_response(string $code, string $token): array
{
    global $config;
    if (($config['app_env'] ?? 'production') !== 'local' || !($config['expose_dev_tokens'] ?? false)) {
        return [];
    }
    return ['development' => ['verification_code' => $code, 'verification_token' => $token]];
}
