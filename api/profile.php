<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';
$user = require_user();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $addressStatement = db()->prepare(
        'SELECT id, street_number, street, postal_code, city, country, is_default
         FROM addresses WHERE user_id = :user_id ORDER BY is_default DESC, id DESC'
    );
    $addressStatement->execute(['user_id' => (int)$user['id']]);
    ok([
        'user' => public_user($user),
        'addresses' => array_map('address_payload', $addressStatement->fetchAll()),
    ]);
}
request_method('POST', 'PUT');

$data = input();
$newEmail = array_key_exists('email', $data) ? email_value($data) : $user['email'];
$oldEmail = optional_string($data, 'oldEmail', 254);
if ($oldEmail !== null && mb_strtolower($oldEmail) !== mb_strtolower((string)$user['email'])) {
    fail('EMAIL_MISMATCH', 'L’ancienne adresse email ne correspond pas au compte.', 422);
}
$name = array_key_exists('name', $data)
    ? optional_string($data, 'name', 120)
    : $user['full_name'];
$phone = array_key_exists('phone', $data)
    ? optional_string($data, 'phone', 40)
    : $user['phone'];

$addressKeys = ['streetNumber', 'street', 'postalCode', 'city'];
$addressProvided = false;
foreach ($addressKeys as $key) {
    if (array_key_exists($key, $data) && $data[$key] !== '') {
        $addressProvided = true;
        break;
    }
}
$address = null;
if ($addressProvided) {
    $address = [
        'street_number' => optional_string($data, 'streetNumber', 20),
        'street' => required_string($data, 'street', 160),
        'postal_code' => required_string($data, 'postalCode', 20),
        'city' => required_string($data, 'city', 120),
        'country' => optional_string($data, 'country', 80) ?? 'France',
    ];
}

$emailChanged = mb_strtolower($newEmail) !== mb_strtolower((string)$user['email']);
$pdo = db();
$verificationCode = null;
$verificationToken = null;
$expiresAt = null;
try {
    if ($emailChanged) {
        $emailCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id <> :id LIMIT 1');
        $emailCheck->execute(['email' => $newEmail, 'id' => (int)$user['id']]);
        if ($emailCheck->fetch()) {
            fail('EMAIL_ALREADY_REGISTERED', 'Cette adresse email est déjà utilisée.', 409);
        }
    }

    $pdo->beginTransaction();
    $update = $pdo->prepare(
        'UPDATE users SET email = :email, full_name = :full_name, phone = :phone,
         email_verified_at = CASE WHEN :email_changed = 1 THEN NULL ELSE email_verified_at END
         WHERE id = :id'
    );
    $update->execute([
        'email' => $newEmail,
        'full_name' => $name,
        'phone' => $phone,
        'email_changed' => $emailChanged ? 1 : 0,
        'id' => (int)$user['id'],
    ]);

    if ($emailChanged) {
        $verificationToken = random_token();
        $verificationCode = verification_code();
        $ttl = max(5, (int)($config['verification_ttl_minutes'] ?? 30));
        $expiresAt = (new DateTimeImmutable('now'))->modify('+' . $ttl . ' minutes')->format('Y-m-d H:i:s');
        $verification = $pdo->prepare(
            'INSERT INTO email_verifications (user_id, token_hash, code_hash, expires_at)
             VALUES (:user_id, :token_hash, :code_hash, :expires_at)'
        );
        $verification->execute([
            'user_id' => (int)$user['id'],
            'token_hash' => token_hash($verificationToken),
            'code_hash' => token_hash($verificationCode),
            'expires_at' => $expiresAt,
        ]);
    }

    if ($address !== null) {
        $unsetDefault = $pdo->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = :user_id');
        $unsetDefault->execute(['user_id' => (int)$user['id']]);
        $addressStatement = $pdo->prepare(
            'SELECT id FROM addresses WHERE user_id = :user_id ORDER BY id ASC LIMIT 1'
        );
        $addressStatement->execute(['user_id' => (int)$user['id']]);
        $existingAddress = $addressStatement->fetch();
        if ($existingAddress) {
            $saveAddress = $pdo->prepare(
                'UPDATE addresses SET street_number = :street_number, street = :street,
                 postal_code = :postal_code, city = :city, country = :country, is_default = 1
                 WHERE id = :id AND user_id = :user_id'
            );
            $saveAddress->execute($address + [
                'id' => (int)$existingAddress['id'],
                'user_id' => (int)$user['id'],
            ]);
        } else {
            $saveAddress = $pdo->prepare(
                'INSERT INTO addresses (user_id, street_number, street, postal_code, city, country)
                 VALUES (:user_id, :street_number, :street, :postal_code, :city, :country)'
            );
            $saveAddress->execute($address + ['user_id' => (int)$user['id']]);
        }
    }
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Profile update failed: ' . $exception->getMessage());
    fail('PROFILE_UPDATE_FAILED', 'Impossible d’enregistrer le profil pour le moment.', 500);
}

$fresh = current_user();
$addressStatement = db()->prepare(
    'SELECT id, street_number, street, postal_code, city, country, is_default
     FROM addresses WHERE user_id = :user_id ORDER BY is_default DESC, id DESC'
);
$addressStatement->execute(['user_id' => (int)$fresh['id']]);
$response = [
    'message' => $emailChanged
        ? 'Profil enregistré. Vérifiez la nouvelle adresse email.'
        : 'Profil enregistré.',
    'user' => public_user($fresh),
    'addresses' => array_map('address_payload', $addressStatement->fetchAll()),
];
if ($emailChanged) {
    $response['email_verification_expires_at'] = $expiresAt;
    $response += dev_token_response((string)$verificationCode, (string)$verificationToken);
}
ok($response);
