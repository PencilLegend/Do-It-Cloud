<?php
header("Content-Type: application/json; charset=utf-8");

// Datenbank-Verbindungsdaten
$host = "localhost";
$user = "root";
$password = "password"; // bitte dein tatsächliches Passwort verwenden
$database = "uploads";

// Verbindung herstellen
$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Verbindung fehlgeschlagen: " . $conn->connect_error]);
    exit;
}

// Prüfe, ob die notwendigen Parameter gesendet wurden
if (!isset($_POST['id']) || !isset($_POST['extra_info'])) {
    echo json_encode(["success" => false, "message" => "Ungültige Parameter."]);
    exit;
}

$id = $_POST['id'];
$extra_info = $_POST['extra_info'];

// Bereite das Update-Statement vor
$stmt = $conn->prepare("UPDATE info SET extra_info = ? WHERE id = ?");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Fehler in der Vorbereitung: " . $conn->error]);
    exit;
}
$stmt->bind_param("si", $extra_info, $id);
$stmt->execute();

if ($stmt->affected_rows >= 0) {
    echo json_encode(["success" => true, "message" => "Extra Info erfolgreich aktualisiert."]);
} else {
    echo json_encode(["success" => false, "message" => "Update fehlgeschlagen."]);
}

$stmt->close();
$conn->close();
?>
