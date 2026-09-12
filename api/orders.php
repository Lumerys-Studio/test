<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';
request_method('GET');
$user = require_user();

$statement = db()->prepare(
    'SELECT id, reference, status, currency, total_cents, created_at, updated_at
     FROM orders WHERE user_id = :user_id ORDER BY created_at DESC, id DESC'
);
$statement->execute(['user_id' => (int)$user['id']]);
$orders = $statement->fetchAll();
$items = db()->prepare(
    'SELECT product_name, sku, unit_price_cents, quantity, total_cents
     FROM order_items WHERE order_id = :order_id ORDER BY id ASC'
);

$result = [];
foreach ($orders as $order) {
    $items->execute(['order_id' => (int)$order['id']]);
    $orderItems = array_map(static function (array $item): array {
        return [
            'product_name' => $item['product_name'],
            'sku' => $item['sku'],
            'unit_price_cents' => (int)$item['unit_price_cents'],
            'quantity' => (int)$item['quantity'],
            'total_cents' => (int)$item['total_cents'],
        ];
    }, $items->fetchAll());
    $result[] = [
        'id' => (int)$order['id'],
        'reference' => $order['reference'],
        'status' => $order['status'],
        'currency' => $order['currency'],
        'total_cents' => (int)$order['total_cents'],
        'created_at' => $order['created_at'],
        'updated_at' => $order['updated_at'],
        'items' => $orderItems,
        'item' => $orderItems[0]['product_name'] ?? null,
    ];
}

ok(['orders' => $result]);
