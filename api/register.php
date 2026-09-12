<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';
request_method('POST');

$data = input();
$email = email_value($data);
$password = password_value($data);
$confirmation = $data['password_confirm'] ?? ($data['passwordConfirm'] ?? null);
if (!is_string($confirmation) || !hash_equals($password, $confirmation)) {
    fail('VALIDATION_ERROR', 'Les mots de passe ne correspondent pas.', 422, ['password_confirm' => 'different']);
}
$name = optional_string($data, 'name', 120);
if ($name === null) {
    $name = optional_string($data, 'full_name', 120);
}

$pdo = db();
$existing = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$existing->execute(['email' => $email]);
if ($existing->fetch()) {
    fail('EMAIL_ALREADY_REGISTERED', 'Cette adresse email est déjà utilisée.', 409);
}

$token = random_token();
$code = verification_code();
$ttl = max(5, (int)($config['verification_ttl_minutes'] ?? 30));
$expiresAt = (new DateTimeImmutable('now'))->modify('+' . $ttl . ' minutes')->format('Y-m-d H:i:s');

try {
    $pdo->beginTransaction();
    $userInsert = $pdo->prepare(
        'INSERT INTO users (email, password_hash, full_name) VALUES (:email, :password_hash, :full_name)'
    );
    $userInsert->execute([
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'full_name' => $name,
    ]);
    $userId = (int)$pdo->lastInsertId();

    $verificationInsert = $pdo->prepare(
        'INSERT INTO email_verifications (user_id, token_hash, code_hash, expires_at)
         VALUES (:user_id, :token_hash, :code_hash, :expires_at)'
    );
    $verificationInsert->execute([
        'user_id' => $userId,
        'token_hash' => token_hash($token),
        'code_hash' => token_hash($code),
        'expires_at' => $expiresAt,
    ]);
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Registration failed: ' . $exception->getMessage());
    fail('REGISTRATION_FAILED', 'Impossible de créer le compte pour le moment.', 500);
}

$response = [
    'message' => 'Compte créé. Vérifiez votre adresse email avec le code reçu.',
    'email' => $email,
    'expires_at' => $expiresAt,
];
ok($response + dev_token_response($code, $token), 201);
