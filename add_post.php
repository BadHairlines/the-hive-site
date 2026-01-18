<?php
$type = $_POST['type'];
$allowed = ['news','events'];
if (!in_array($type, $allowed)) die("Invalid type");
$file = $type . '.json';
$title = htmlspecialchars($_POST['title']);
$date = $_POST['date'];
$content = htmlspecialchars($_POST['content']);
if (!DateTime::createFromFormat('Y-m-d', $date)) {
    die("Invalid date format, must be YYYY-MM-DD");
}
$data = json_decode(file_get_contents($file), true) ?? [];
$data[] = [
    "title" => $title,
    "date" => $date,
    $type === 'news' ? "content" : "description" => $content
];
file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
header("Location: admin.html");
exit;
