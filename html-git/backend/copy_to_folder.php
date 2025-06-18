<?php
header("Content-Type: application/json; charset=utf-8");

// Konfiguration
$nasBasePath = '/mnt/nas/';
$host = "localhost";
$user = "root";
$password = "password";
$database = "uploads";

// Prüfen, ob die POST-Parameter gesetzt sind
if (!isset($_POST['id']) || !isset($_POST['target_folder'])) {
    echo json_encode(["success" => false, "message" => "Ungültige Parameter."]);
    exit;
}

$id = $_POST['id'];
$targetFolder = $_POST['target_folder'];

// Datenbankverbindung herstellen
$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Verbindungsfehler: " . $conn->connect_error]);
    exit;
}

// Hole den aktuellen Dateieintrag inklusive aller relevanten Felder
$stmt = $conn->prepare("SELECT folder, name, file_type, file_size, modification_date, extra_info FROM info WHERE id = ?");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Abfragefehler: " . $conn->error]);
    exit;
}
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Dateieintrag nicht gefunden."]);
    exit;
}
$row = $result->fetch_assoc();
$currentFolder = $row['folder'];
$fileName = $row['name'];
$fileType = $row['file_type'];
$fileSize = $row['file_size'];
$modificationDate = $row['modification_date'];
$extraInfo = $row['extra_info'];
$stmt->close();

// Erstelle die vollständigen Dateipfade
$currentFilePath = rtrim($nasBasePath, '/') . '/' . $currentFolder . '/' . $fileName;
$destinationFilePath = rtrim($nasBasePath, '/') . '/' . $targetFolder . '/' . $fileName;

// Prüfen, ob die Quelldatei existiert
if (!file_exists($currentFilePath)) {
    echo json_encode(["success" => false, "message" => "Datei existiert nicht: $currentFilePath"]);
    exit;
}

// Versuche, die Datei in den Zielordner zu kopieren
if (!copy($currentFilePath, $destinationFilePath)) {
    echo json_encode(["success" => false, "message" => "Fehler beim Kopieren der Datei."]);
    exit;
}

// Füge einen neuen Datenbankeintrag für die kopierte Datei ein
$stmt = $conn->prepare("INSERT INTO info (name, file_type, file_size, modification_date, extra_info, folder) VALUES (?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Fehler beim Vorbereiten des Eintrags: " . $conn->error]);
    exit;
}
$stmt->bind_param("ssisss", $fileName, $fileType, $fileSize, $modificationDate, $extraInfo, $targetFolder);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(["success" => true, "message" => "Datei erfolgreich in den Ordner '$targetFolder' kopiert."]);
} else {
    echo json_encode(["success" => false, "message" => "Datenbankeintragung fehlgeschlagen."]);
}
$stmt->close();
$conn->close();
?>
