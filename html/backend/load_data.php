<?php
header("Content-Type: text/html; charset=utf-8");
ini_set('display_errors', 1);
error_reporting(E_ALL);

$host = "localhost";
$user = "root";
$password = "Password"; // Ersetze durch dein tatsächliches Passwort
$database = "uploads";

// Verbindung herstellen
$conn = new mysqli($host, $user, $password, $database);
if($conn->connect_error) {
    die("Verbindung fehlgeschlagen: " . $conn->connect_error);
}

$conditions = [];

// Filter: Name (Suche in der "name"-Spalte)
if(isset($_GET['name']) && $_GET['name'] !== "") {
    $name = $conn->real_escape_string($_GET['name']);
    $conditions[] = "name LIKE '%$name%'";
}

// Filter: Dateityp (mehrere durch Komma getrennt)
if(isset($_GET['file_types']) && $_GET['file_types'] !== "") {
    $fileTypes = explode(",", $_GET['file_types']);
    $escapedTypes = [];
    foreach($fileTypes as $type) {
        $escapedTypes[] = "'" . $conn->real_escape_string(trim($type)) . "'";
    }
    $conditions[] = "file_type IN (" . implode(",", $escapedTypes) . ")";
}

// Filter: Größe – Eingabe in MB (Umrechnung in Bytes)
if(isset($_GET['size_from']) && is_numeric($_GET['size_from'])) {
    $sizeFromMB = floatval($_GET['size_from']);
    $sizeFromBytes = $sizeFromMB * 1024 * 1024;
    $conditions[] = "file_size >= $sizeFromBytes";
}
if(isset($_GET['size_to']) && is_numeric($_GET['size_to'])) {
    $sizeToMB = floatval($_GET['size_to']);
    $sizeToBytes = $sizeToMB * 1024 * 1024;
    $conditions[] = "file_size <= $sizeToBytes";
}

// Filter: Datum
if(isset($_GET['date_from']) && $_GET['date_from'] !== "") {
    $dateFrom = $conn->real_escape_string($_GET['date_from']);
    $conditions[] = "DATE(modification_date) >= '$dateFrom'";
}
if(isset($_GET['date_to']) && $_GET['date_to'] !== "") {
    $dateTo = $conn->real_escape_string($_GET['date_to']);
    $conditions[] = "DATE(modification_date) <= '$dateTo'";
}

// Filter: Ordner (Mehrfachauswahl)
if(isset($_GET['folders']) && $_GET['folders'] !== "") {
    $folders = explode(",", $_GET['folders']);
    $escapedFolders = [];
    foreach($folders as $folder) {
        $escapedFolders[] = "'" . $conn->real_escape_string(trim($folder)) . "'";
    }
    $conditions[] = "folder IN (" . implode(",", $escapedFolders) . ")";
}

$where_clause = "";
if(!empty($conditions)) {
    $where_clause = "WHERE " . implode(" AND ", $conditions);
}

$sql = "SELECT id, name, file_type, file_size, modification_date, extra_info, folder FROM info $where_clause ORDER BY id DESC";
$result = $conn->query($sql);

if(!$result){
    echo "Fehler bei der Abfrage: " . $conn->error;
    exit;
}

// Tabelle erzeugen – Dateigröße formatieren
echo "<table>";
echo "<tr>
        <th>ID</th>
        <th>Name</th>
        <th>Dateityp</th>
        <th>Dateigröße</th>
        <th>Änderungsdatum</th>
        <th>Zusatzinfo</th>
        <th>Ordner</th>
      </tr>";

if($result->num_rows > 0) {
    while($row = $result->fetch_assoc()){
        // Trenne Basisname und Dateierweiterung
        $fullName = $row["name"];
        $pathInfo = pathinfo($fullName);
        $baseName = $pathInfo['filename'];
        $ext = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
        
        $bytes = $row["file_size"];
        if($bytes < 1024){
            $displaySize = $bytes . " B";
        } elseif($bytes < 1024*1024){
            $displaySize = round($bytes / 1024, 2) . " KB";
        } elseif($bytes < 1024*1024*1024){
            $displaySize = round($bytes / (1024*1024), 2) . " MB";
        } else {
            $displaySize = round($bytes / (1024*1024*1024), 2) . " GB";
        }

        echo "<tr>";
        echo "<td>" . htmlspecialchars($row["id"]) . "</td>";
        
        // In der Namensspalte: Der bearbeitbare Basisname plus ein fester, nicht editierbarer
        // Dateityp-Suffix (Extension)
        echo "<td data-id='" . htmlspecialchars($row["id"]) . "' data-folder='" . htmlspecialchars($row["folder"]) . "'>";
        echo "<span class='file-name' data-original='" . htmlspecialchars($baseName) . "'>" . htmlspecialchars($baseName) . "</span>";
        echo "<span class='file-ext'>" . htmlspecialchars($ext) . "</span> ";
        echo "<button class='edit-btn' title='Datei umbenennen'>&#9998;</button>";
        echo "</td>";
        
        echo "<td>" . htmlspecialchars($row["file_type"]) . "</td>";
        echo "<td>" . htmlspecialchars($displaySize) . "</td>";
        echo "<td>" . htmlspecialchars($row["modification_date"]) . "</td>";
        echo "<td>" . htmlspecialchars($row["extra_info"]) . "</td>";
        echo "<td>" . htmlspecialchars($row["folder"]) . "</td>";
        echo "</tr>";
    }
} else {
    echo "<tr><td colspan='7'>Keine Ergebnisse gefunden.</td></tr>";
}
echo "</table>";
$conn->close();
?>
