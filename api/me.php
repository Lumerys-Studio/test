<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';
request_method('GET');

$user = current_user();
if ($user === null) {
    ok(['authenticated' => false, 'user' => null, 'addresses' => []]);
}

$addressStatement = db()->prepare(
    'SELECT id, street_number, street, postal_code, city, country, is_default
     FROM addresses WHERE user_id = :user_id ORDER BY is_default DESC, id DESC'
);
$addressStatement->execute(['user_id' => (int)$user['id']]);
$addresses = array_map('address_payload', $addressStatement->fetchAll());
ok(['authenticated' => true, 'user' => public_user($user), 'addresses' => $addresses]);
