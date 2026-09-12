<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';

request_method('POST');

$data = input();
$name = required_string($data, 'nom', 120);
$email = email_value($data);
$subject = required_string($data, 'objet', 160);
$message = required_string($data, 'message', 5000);

global $config;
$recipient = (string)($config['contact_email'] ?? 'lamorillecanourgaise@outlook.fr');
$mailSubject = 'Nouveau message du site : ' . $subject;
$mailBody = "Nom : {$name}\nEmail : {$email}\nObjet : {$subject}\n\n{$message}";
$headers = [
    'From: La Morille Canourgaise <' . $recipient . '>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
];

if (!mail($recipient, $mailSubject, $mailBody, implode("\r\n", $headers))) {
    error_log('Contact email could not be sent.');
    fail('MAIL_UNAVAILABLE', 'Le message n’a pas pu être envoyé. Réessayez plus tard.', 503);
}

ok();
