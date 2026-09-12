<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';
request_method('POST');

$data = input();
$email = email_value($data);
$code = optional_string($data, 'code', 128);
$token = optional_string($data, 'token', 128);
if ($code === null && $token === null) {
    fail('VALIDATION_ERROR', 'Un code ou un token de vérification est obligatoire.', 422);
}

$userStatement = db()->prepare('SELECT id, email_verified_at FROM users WHERE email = :email LIMIT 1');
$userStatement->execute(['email' => $email]);
$user = $userStatement->fetch();
if (!$user) {
    fail('VERIFICATION_INVALID', 'Code de vérification invalide ou expiré.', 400);
}
if ($user['email_verified_at'] !== null) {
    ok(['message' => 'Cette adresse email est déjà vérifiée.']);
}

$statement = db()->prepare(
    'SELECT id, token_hash, code_hash, expires_at, attempts
     FROM email_verifications
     WHERE user_id = :user_id AND consumed_at IS NULL
     ORDER BY id DESC LIMIT 1'
);
$statement->execute(['user_id' => (int)$user['id']]);
$verification = $statement->fetch();
$validValue = $code !== null ? $code : $token;
$validHash = $verification
    ? ($code !== null ? (string)$verification['code_hash'] : (string)$verification['token_hash'])
    : '';
$isValid = $verification
    && (int)$verification['attempts'] < 5
    && strtotime((string)$verification['expires_at']) >= time()
    && hash_equals($validHash, token_hash($validValue));

if (!$isValid) {
    if ($verification && (int)$verification['attempts'] < 5) {
        $attempt = db()->prepare('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = :id');
        $attempt->execute(['id' => (int)$verification['id']]);
    }
    fail('VERIFICATION_INVALID', 'Code de vérification invalide ou expiré.', 400);
}

$pdo = db();
try {
    $pdo->beginTransaction();
    $consume = $pdo->prepare('UPDATE email_verifications SET consumed_at = NOW() WHERE id = :id AND consumed_at IS NULL');
    $consume->execute(['id' => (int)$verification['id']]);
    $updateUser = $pdo->prepare('UPDATE users SET email_verified_at = NOW() WHERE id = :id');
    $updateUser->execute(['id' => (int)$user['id']]);
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Email verification failed: ' . $exception->getMessage());
    fail('VERIFICATION_FAILED', 'La vérification a échoué. Réessayez.', 500);
}

ok(['message' => 'Adresse email vérifiée. Vous pouvez maintenant vous connecter.']);
