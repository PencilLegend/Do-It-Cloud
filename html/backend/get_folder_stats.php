<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$folderPath = '/mnt/nas/' . $data['path'];

function scanDirectory($dir) {
    $fileTypes = [];
    $totalFiles = 0;
    $subfolders = -1; // Start at -1 to not count the root folder itself

    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                $subfolders++;
                continue;
            }
            
            $totalFiles++;
            $extension = strtolower($file->getExtension());
            if ($extension === '') {
                $extension = 'no extension';
            }
            
            if (!isset($fileTypes[$extension])) {
                $fileTypes[$extension] = 0;
            }
            $fileTypes[$extension]++;
        }

        // Only calculate percentages if there are files
        if ($totalFiles > 0) {
            foreach ($fileTypes as $type => $count) {
                $fileTypes[$type] = round(($count / $totalFiles) * 100, 1);
            }
        }

        return [
            'success' => true,
            'subfolders' => max(0, $subfolders), // Ensure non-negative value
            'totalFiles' => $totalFiles,
            'fileTypes' => $fileTypes
        ];
    } catch (Exception $e) {
        throw new Exception("Error scanning directory: " . $e->getMessage());
    }
}

try {
    $stats = scanDirectory($folderPath);
    echo json_encode($stats);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
