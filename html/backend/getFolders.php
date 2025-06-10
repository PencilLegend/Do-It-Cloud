<?php
$nasBasePath = '/mnt/nas/';
$folders = [];
$subfolders = [];

function scandir_recursive($dir, $base = '') {
    $result = [];
    foreach(scandir($dir) as $filename) {
        if ($filename[0] === '.') continue;
        $filePath = $dir . '/' . $filename;
        if (is_dir($filePath)) {
            $path = trim($base . '/' . $filename, '/');
            $result[] = $path;
            $result = array_merge($result, scandir_recursive($filePath, $path));
        }
    }
    return $result;
}

if (is_dir($nasBasePath)) {
    // Get root folders for the dropdown
    $rootFolders = array_filter(scandir($nasBasePath), function($item) use ($nasBasePath) {
        return $item[0] !== '.' && is_dir($nasBasePath . $item);
    });
    
    // Get all subfolders for the path input
    $allFolders = scandir_recursive($nasBasePath);

    $response = [
        'rootFolders' => array_values($rootFolders),
        'allFolders' => $allFolders
    ];
    
    header('Content-Type: application/json');
    echo json_encode($response);
}
?>
