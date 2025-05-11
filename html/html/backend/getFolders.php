<?php
$nasBasePath = '/mnt/nas/';
$folders = [];

if (is_dir($nasBasePath)) {
    if ($dh = opendir($nasBasePath)) {
        while (($file = readdir($dh)) !== false) {
            if ($file != "." && $file != "..") {
                $fullPath = $nasBasePath . $file;
                if (is_dir($fullPath)) {
                    $folders[] = $file;
                }
            }
        }
        closedir($dh);
    }
}

header('Content-Type: application/json');
echo json_encode($folders);
?>
