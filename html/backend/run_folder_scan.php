<?php
header('Content-Type: application/json');

$output = array();
$return_var = 0;

exec('python3 scan_folders.py 2>&1', $output, $return_var);

if ($return_var === 0) {
    echo json_encode(array(
        'success' => true,
        'message' => 'Folder scan completed successfully'
    ));
} else {
    echo json_encode(array(
        'success' => false,
        'message' => 'Error during folder scan: ' . implode("\n", $output)
    ));
}
