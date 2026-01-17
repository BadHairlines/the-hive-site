<?php
$type = $_POST['type']; // news or events
$allowed = ['news','events'];

if (!in_array($type, $allowed)) die("Invalid type");

$file = $type . '.json';

$data = json_decode(file_get_contents($file), true);

$data[] = [
    "title" => $_POST['title'],
    "date" => $_POST['date'],
    // Use 'content' for news, 'description' for events
    $type === 'news' ? "content" : "description" => $_POST['content']
];

file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
header("Location: admin.html");
