<?php
// download_file.php
// Dieses Skript ermöglicht den Download einer Datei, basierend auf der Datei-ID in der Datenbank.

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Datenbankkonfiguration
$host = "localhost";
$user = "root";
$password = "password"; // Bitte durch dein tatsächliches Passwort ersetzen
$database = "uploads";

// Überprüfen, ob eine Datei-ID übergeben wurde
if (!isset($_GET['id']) || empty($_GET['id'])) {
    header('HTTP/1.1 400 Bad Request');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["success" => false, "message" => "Keine Datei-ID angegeben."]);
    exit();
}

$fileId = intval($_GET['id']);

// Verbindung zur Datenbank herstellen
$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["success" => false, "message" => "Datenbankverbindung fehlgeschlagen: " . $conn->connect_error]);
    exit();
}

// Dateiinformationen anhand der ID abrufen
$stmt = $conn->prepare("SELECT folder, name, file_type FROM info WHERE id = ?");
if (!$stmt) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["success" => false, "message" => "Fehler in der Datenbankabfrage: " . $conn->error]);
    exit();
}
$stmt->bind_param("i", $fileId);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    header('HTTP/1.1 404 Not Found');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["success" => false, "message" => "Dateieintrag nicht gefunden."]);
    exit();
}
$row = $result->fetch_assoc();
$stmt->close();
$conn->close();

// Werte aus dem Datenbankeintrag
$folder = $row['folder'];
$fileName = $row['name'];
// Optional: $fileType kann verwendet werden, um den MIME-Type zu bestimmen, falls benötigt
//$fileType = $row['file_type'];

// Aufbau des vollständigen Dateipfades
$nasBasePath = '/mnt/nas/';
$filePath = rtrim($nasBasePath, '/') . '/' . $folder . '/' . $fileName;

if (!file_exists($filePath)) {
    header('HTTP/1.1 404 Not Found');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["success" => false, "message" => "Datei nicht gefunden."]);
    exit();
}

// MIME-Type bestimmen (falls die Funktion mime_content_type verfügbar ist)
if (function_exists('mime_content_type')) {
    $mimeType = mime_content_type($filePath);
} else {
    $mimeType = "application/octet-stream";
}

// Sende die Headers, damit der Browser den Download startet
header("Content-Description: File Transfer");
header("Content-Type: " . $mimeType);
header("Content-Disposition: attachment; filename=\"" . basename($fileName) . "\"");
header("Expires: 0");
header("Cache-Control: must-revalidate");
header("Pragma: public");
header("Content-Length: " . filesize($filePath));
flush();
// Sende den Dateiinhalt
readfile($filePath);
exit();
?>
