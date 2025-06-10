<?php
header('Content-Type: application/json');

$nasBasePath = '/mnt/nas/';
$folder = isset($_GET['folder']) ? trim($_GET['folder'], '/') : 'content';
$folderPath = $nasBasePath . $folder;

// Supported media extensions
$mediaExtensions = array(
    'mp4', 'webm', 'ogg',  // Video
    'mp3', 'wav',          // Audio
    'jpg', 'jpeg', 'png', 'gif', 'webp'  // Images
);

$files = array();

if (is_dir($folderPath)) {
    foreach (scandir($folderPath) as $file) {
        if ($file[0] === '.') continue;
        
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($extension, $mediaExtensions)) {
            $files[] = $file;
        }
    }
}

echo json_encode($files);
