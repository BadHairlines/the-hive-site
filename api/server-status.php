<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=30, stale-while-revalidate=60');
header('X-Content-Type-Options: nosniff');

$token = trim((string) getenv('NITRADO_TOKEN'));
$serviceIds = array_values(array_filter(array_map('trim', explode(',', (string) getenv('NITRADO_SERVICE_IDS')))));
$labels = array_map('trim', explode(',', (string) getenv('NITRADO_SERVER_LABELS')));

if ($token === '') {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'Live server status is not configured.']);
    exit;
}

foreach ($serviceIds as $id) {
    if (!preg_match('/^\d+$/', $id)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Invalid server configuration.']);
        exit;
    }
}

$cacheFile = sys_get_temp_dir() . '/the-hive-nitrado-status.json';
if (is_file($cacheFile) && time() - filemtime($cacheFile) < 30) {
    readfile($cacheFile);
    exit;
}

function nitradoGet(string $url, string $token): array {
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
            'User-Agent: TheHiveDayZ-Website/1.0',
        ],
    ]);
    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $error = curl_error($curl);
    curl_close($curl);
    if ($body === false || $error !== '' || $status < 200 || $status >= 300) {
        throw new RuntimeException('Nitrado request failed.');
    }
    $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    return (array) ($payload['data'] ?? []);
}

try {
    if (count($serviceIds) === 0) {
        $serviceData = nitradoGet('https://api.nitrado.net/services', $token);
        $services = (array) ($serviceData['services'] ?? []);
        foreach ($services as $service) {
            $type = strtolower((string) ($service['service_type'] ?? ''));
            $game = strtolower((string) ($service['details']['game'] ?? ''));
            if ($type !== 'gameserver') continue;
            if ($game !== '' && !str_contains($game, 'dayz')) continue;
            $id = (string) ($service['id'] ?? '');
            if (preg_match('/^\d+$/', $id)) $serviceIds[] = $id;
        }
    }
    if (count($serviceIds) === 0) {
        throw new RuntimeException('No accessible DayZ game-server services were found.');
    }

    $servers = [];
    foreach ($serviceIds as $index => $serviceId) {
        $gameData = nitradoGet('https://api.nitrado.net/services/' . rawurlencode($serviceId) . '/gameservers', $token);
        $game = (array) ($gameData['gameserver'] ?? []);
        $query = (array) ($game['query'] ?? []);
        $config = (array) (($game['settings']['config'] ?? []));
        $players = (int) ($query['player_current'] ?? 0);
        $slots = (int) ($query['player_max'] ?? $config['maxplayers'] ?? 0);
        $servers[] = [
            'label' => $labels[$index] ?? ('Hive Server ' . ($index + 1)),
            'name' => (string) ($query['server_name'] ?? $config['hostname'] ?? $labels[$index] ?? 'The Hive'),
            'status' => (string) ($game['status'] ?? 'unknown'),
            'map' => (string) ($query['map'] ?? ''),
            'players' => $players,
            'slots' => $slots,
        ];
    }
    $response = json_encode([
        'ok' => true,
        'updated_at' => gmdate('c'),
        'servers' => $servers,
        'totals' => [
            'players' => array_sum(array_column($servers, 'players')),
            'slots' => array_sum(array_column($servers, 'slots')),
        ],
    ], JSON_UNESCAPED_SLASHES);
    file_put_contents($cacheFile, $response, LOCK_EX);
    echo $response;
} catch (Throwable $error) {
    if (is_file($cacheFile)) {
        header('X-Hive-Status: stale');
        readfile($cacheFile);
        exit;
    }
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Live status is temporarily unavailable.']);
}
