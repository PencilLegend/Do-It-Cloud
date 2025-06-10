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

// Hole den aktuellen Dateieintrag (aktueller Ordner und Dateiname)
$stmt = $conn->prepare("SELECT folder, name FROM info WHERE id = ?");
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
$stmt->close();

// Erstelle die vollständigen Dateipfade
$currentFilePath = rtrim($nasBasePath, '/') . '/' . $currentFolder . '/' . $fileName;
$destinationFilePath = rtrim($nasBasePath, '/') . '/' . $targetFolder . '/' . $fileName;

// Prüfen, ob die Quelldatei existiert
if (!file_exists($currentFilePath)) {
    echo json_encode(["success" => false, "message" => "Datei existiert nicht: $currentFilePath"]);
    exit;
}

// Versuche, die Datei ins Ziel zu verschieben
if (!rename($currentFilePath, $destinationFilePath)) {
    echo json_encode(["success" => false, "message" => "Fehler beim Verschieben der Datei."]);
    exit;
}

// Datenbankeintrag aktualisieren: Setze den Ordner neu
$stmt = $conn->prepare("UPDATE info SET folder = ? WHERE id = ?");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Aktualisierungsfehler: " . $conn->error]);
    exit;
}
$stmt->bind_param("si", $targetFolder, $id);
$stmt->execute();

if ($stmt->affected_rows >= 0) {
    echo json_encode(["success" => true, "message" => "Datei erfolgreich in den Ordner '$targetFolder' verschoben."]);
} else {
    echo json_encode(["success" => false, "message" => "Datenbankaktualisierung fehlgeschlagen."]);
}
$stmt->close();
$conn->close();
?>
