<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$host = "localhost";
$user = "root";
$password = "Password"; // Ersetze durch dein tatsächliches Passwort
$database = "uploads";

// Verbindung herstellen
$conn = new mysqli($host, $user, $password, $database);
if($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Verbindung fehlgeschlagen: " . $conn->connect_error]);
    exit;
}

if(isset($_POST['id']) && isset($_POST['new_name'])) {
    $id = intval($_POST['id']);
    $new_base = trim($_POST['new_name']);
    if($new_base === "") {
        echo json_encode(["success" => false, "message" => "Der neue Name darf nicht leer sein."]);
        exit;
    }
    
    // Hole den alten Dateinamen und den Ordner aus der DB
    $sql = "SELECT name, folder FROM info WHERE id = $id";
    $result = $conn->query($sql);
    if($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $old_name = $row["name"];
        $folder = $row["folder"];
        
        // Ermittle die alte Dateierweiterung (inklusive '.' falls vorhanden)
        $ext = pathinfo($old_name, PATHINFO_EXTENSION);
        $ext = $ext ? "." . $ext : "";
        
        // Entferne etwaige Punkte bzw. Erweiterungen aus dem neuen Namen:
        if(strpos($new_base, ".") !== false) {
            // Falls der Nutzer einen Punkt eingibt, nehme nur den Teil vor dem ersten Punkt
            $parts = explode('.', $new_base);
            $new_base = $parts[0];
        }
        
        // Baue den finalen neuen Dateinamen zusammen, indem die alte Erweiterung wieder angehängt wird.
        $final_new_name = $new_base . $ext;
        
        $nas_base = '/mnt/nas/';
        $old_file_path = $nas_base . $folder . "/" . $old_name;
        $new_file_path = $nas_base . $folder . "/" . $final_new_name;
        
        if(!file_exists($old_file_path)) {
            echo json_encode(["success" => false, "message" => "Datei existiert nicht."]);
            exit;
        }
        
        if(!rename($old_file_path, $new_file_path)) {
            echo json_encode(["success" => false, "message" => "Datei konnte nicht umbenannt werden."]);
            exit;
        }
        
        $final_new_name_escaped = $conn->real_escape_string($final_new_name);
        $update_sql = "UPDATE info SET name = '$final_new_name_escaped' WHERE id = $id";
        if($conn->query($update_sql)) {
            echo json_encode(["success" => true, "message" => "Dateiname erfolgreich aktualisiert.", "new_fullname" => $final_new_name]);
        } else {
            echo json_encode(["success" => false, "message" => "Datenbankfehler: " . $conn->error]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Datensatz nicht gefunden."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Ungültige Parameter."]);
}
$conn->close();
?>
