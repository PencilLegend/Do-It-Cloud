<?php
header('Content-Type: application/json');

// Lese die JSON-Daten aus der Anfrage
$data = json_decode(file_get_contents("php://input"), true);

// Überprüfe, ob ein Ordnername übermittelt wurde
if (!$data || !isset($data['folderName'])) {
    echo json_encode(["success" => false, "message" => "Kein Ordnername übermittelt."]);
    exit;
}

$folderName = $data['folderName'];
// Entferne unerwünschte Zeichen aus dem Ordnernamen (nur Buchstaben, Zahlen, Unterstrich und Bindestrich erlaubt)
$folderName = preg_replace("/[^a-zA-Z0-9_-]/", "", $folderName);

$basePath = "/mnt/nas/";
$newFolderPath = $basePath . $folderName;

if (empty($folderName)) {
    echo json_encode(["success" => false, "message" => "Kein gültiger Ordnername."]);
    exit;
}

// Überprüfe, ob der Ordner bereits existiert
if (file_exists($newFolderPath)) {
    echo json_encode(["success" => false, "message" => "Ordner existiert bereits."]);
    exit;
}

// Erstelle den neuen Ordner
if (mkdir($newFolderPath, 0775, true)) {
    echo json_encode(["success" => true, "message" => "Ordner '$folderName' wurde erfolgreich erstellt."]);
} else {
    echo json_encode(["success" => false, "message" => "Fehler beim Erstellen des Ordners."]);
}
exit;
?>
