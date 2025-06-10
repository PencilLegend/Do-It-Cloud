<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$folderPath = '/mnt/nas/' . $data['path'];

function deleteDirectory($dir) {
    if (!file_exists($dir)) {
        return true;
    }
    if (!is_dir($dir)) {
        return unlink($dir);
    }
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') {
            continue;
        }
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}

if (deleteDirectory($folderPath)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete folder'
    ]);
}
