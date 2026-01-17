<?php
$type = $_POST['type']; // news or events
$file = $type . '.json';

$data = json_decode(file_get_contents($file), true);

$data[] = [
  "title" => $_POST['title'],
  "content" => $_POST['content'],
  "date" => $_POST['date']
];

file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
header("Location: admin.html");
