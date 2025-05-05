<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$output = array();
$command = "python3 /var/www/html/backend/scan.py"; // Absoluter Pfad zu scan.py
exec($command, $output, $return_var);

header("Content-Type: application/json");
echo json_encode(array(
    "return_value" => $return_var,
    "output" => $output
));
?>
