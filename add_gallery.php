<?php
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$image = trim($_POST['image'] ?? '');

if ($title === '' || $description === '' || $image === '') {
    die('Missing gallery fields');
}

$file = 'gallery.json';
$existing = [];
if (file_exists($file)) {
    $existing = json_decode(file_get_contents($file), true);
    if (!is_array($existing)) {
        $existing = [];
    }
}

$existing[] = [
    'title' => $title,
    'description' => $description,
    'image' => $image,
    'date' => date('Y-m-d')
];

file_put_contents($file, json_encode($existing, JSON_PRETTY_PRINT));
header('Location: admin.html');
