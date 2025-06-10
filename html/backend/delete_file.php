<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$host = "localhost";
$user = "root";
$password = "password"; // Bitte durch dein tatsächliches Passwort ersetzen
$database = "uploads";

$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => "Verbindung fehlgeschlagen: " . $conn->connect_error]);
    exit;
}

if (!isset($_POST['id']) || !is_numeric($_POST['id'])) {
    echo json_encode(['success' => false, 'message' => "Ungültige ID"]);
    exit;
}

$id = intval($_POST['id']);

// Hole die Dateiinformationen
$sql = "SELECT name, folder FROM info WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
if($result->num_rows == 0) {
    echo json_encode(['success' => false, 'message' => "Datei nicht gefunden"]);
    exit;
}
$row = $result->fetch_assoc();
$stmt->close();

$fullName = $row['name'];
$folderName = $row['folder'];
$nasPath = "/mnt/nas/";
$fullPath = $nasPath . $folderName . "/" . $fullName;

if (file_exists($fullPath)) {
    if (!unlink($fullPath)) {
        echo json_encode(['success' => false, 'message' => "Datei konnte nicht gelöscht werden"]);
        exit;
    }
}

$sql = "DELETE FROM info WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
if($stmt->execute()){
    echo json_encode(['success' => true, 'message' => "Datei erfolgreich gelöscht"]);
} else {
    echo json_encode(['success' => false, 'message' => "Löschung fehlgeschlagen: " . $conn->error]);
}
$stmt->close();
$conn->close();
?>
