<?php
$type = $_POST['type']; // news or events
$allowed = ['news','events'];
if (!in_array($type, $allowed)) die("Invalid type");

$file = $type . '.json';

$title = htmlspecialchars($_POST['title']);
$date = $_POST['date'];
$content = htmlspecialchars($_POST['content']);

// validate date
if (!DateTime::createFromFormat('Y-m-d', $date)) {
    die("Invalid date format, must be YYYY-MM-DD");
}

// load existing data
$data = json_decode(file_get_contents($file), true) ?? [];

$data[] = [
    "title" => $title,
    "date" => $date,
    $type === 'news' ? "content" : "description" => $content
];

// write safely
file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);

// redirect
header("Location: admin.html");
exit;
