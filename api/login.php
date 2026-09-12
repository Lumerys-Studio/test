<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';
request_method('POST');

$data = input();
$email = email_value($data);
$password = password_value($data);

$statement = db()->prepare(
    'SELECT id, email, password_hash, full_name, phone, email_verified_at, created_at
     FROM users WHERE email = :email AND status = "active" LIMIT 1'
);
$statement->execute(['email' => $email]);
$user = $statement->fetch();

if (!$user || !password_verify($password, (string)$user['password_hash'])) {
    fail('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.', 401);
}
if ($user['email_verified_at'] === null) {
    fail('EMAIL_NOT_VERIFIED', 'Vérifiez votre adresse email avant de vous connecter.', 403);
}
if (password_needs_rehash((string)$user['password_hash'], PASSWORD_DEFAULT)) {
    $rehash = db()->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
    $rehash->execute([
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'id' => (int)$user['id'],
    ]);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['authenticated_at'] = time();

ok(['message' => 'Connexion réussie.', 'user' => public_user($user)]);
