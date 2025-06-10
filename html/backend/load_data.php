<?php
header("Content-Type: text/html; charset=utf-8");
ini_set('display_errors', 1);
error_reporting(E_ALL);

$host = "localhost";
$user = "root";
$password = "password"; // Ersetze durch dein tatsächliches Passwort
$database = "uploads";

// Verbindung herstellen
$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die("Verbindung fehlgeschlagen: " . $conn->connect_error);
}

$conditions = [];
$params = [];
$param_types = "";

// Filter: Name (Suche in der "name"-Spalte)
if (isset($_GET['name']) && $_GET['name'] !== "") {
    $conditions[] = "name LIKE ?";
    $params[] = "%" . $_GET['name'] . "%";
    $param_types .= "s";
}

// Filter: Dateityp (mehrere durch Komma getrennt)
if (isset($_GET['file_types']) && $_GET['file_types'] !== "") {
    $fileTypes = explode(",", $_GET['file_types']);
    $fileTypes = array_map('trim', $fileTypes);
    if (count($fileTypes) > 0) {
        // Erzeugen von Platzhaltern für jeden Dateityp
        $placeholders = implode(",", array_fill(0, count($fileTypes), "?"));
        $conditions[] = "file_type IN ($placeholders)";
        foreach ($fileTypes as $ft) {
            $params[] = $ft;
            $param_types .= "s";
        }
    }
}

// Filter: Größenfilter (Eingabe in MB; Umrechnung in Bytes)
if (isset($_GET['size_from']) && is_numeric($_GET['size_from'])) {
    $sizeFromMB = floatval($_GET['size_from']);
    $sizeFromBytes = $sizeFromMB * 1024 * 1024;
    $conditions[] = "file_size >= ?";
    $params[] = $sizeFromBytes;
    $param_types .= "d";
}
if (isset($_GET['size_to']) && is_numeric($_GET['size_to'])) {
    $sizeToMB = floatval($_GET['size_to']);
    $sizeToBytes = $sizeToMB * 1024 * 1024;
    $conditions[] = "file_size <= ?";
    $params[] = $sizeToBytes;
    $param_types .= "d";
}

// Filter: Datumsfilter
if (isset($_GET['date_from']) && $_GET['date_from'] !== "") {
    $conditions[] = "DATE(modification_date) >= ?";
    $params[] = $_GET['date_from'];
    $param_types .= "s";
}
if (isset($_GET['date_to']) && $_GET['date_to'] !== "") {
    $conditions[] = "DATE(modification_date) <= ?";
    $params[] = $_GET['date_to'];
    $param_types .= "s";
}

// Filter: Ordner (Mehrfachauswahl aus den dynamisch geladenen Ordnern)
// Dabei wird angenommen, dass der übergebene GET-Parameter "folders" eine
// durch Komma getrennte Liste der gewünschten Ordnernamen enthält.
if (isset($_GET['folders']) && $_GET['folders'] !== "") {
    $folders = explode(",", $_GET['folders']);
    $folders = array_map('trim', $folders);
    $folders = array_filter($folders); // Remove empty entries
    
    if (count($folders) > 0) {
        $placeholders = implode(",", array_fill(0, count($folders), "?"));
        $conditions[] = "folder IN ($placeholders)";
        foreach ($folders as $folder) {
            // Remove leading/trailing slashes for consistency
            $folder = trim($folder, '/');
            $params[] = $folder;
            $param_types .= "s";
        }
    }
}

$where_clause = "";
if (!empty($conditions)) {
    $where_clause = "WHERE " . implode(" AND ", $conditions);
}

$sql = "SELECT id, name, file_type, file_size, modification_date, extra_info, folder FROM info $where_clause ORDER BY id DESC";

// Prepared Statement erstellen
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo "Fehler in der Abfrage Vorbereitung: " . $conn->error;
    exit;
}
if (!empty($params)) {
    // Seit PHP 5.6 kann man den Spread-Operator nutzen; es wird vorausgesetzt, dass die PHP-Version aktuell genug ist
    $stmt->bind_param($param_types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();
if (!$result) {
    echo "Fehler beim Ausführen der Abfrage: " . $stmt->error;
    exit;
}

// Tabelle erzeugen – Dateigröße wird formatiert
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

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Basisname und Extension trennen
        $fullName = $row["name"];
        $pathInfo = pathinfo($fullName);
        $baseName = $pathInfo['filename'];
        $ext = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';

        // Dateigröße in B, KB, MB oder GB umrechnen
        $bytes = $row["file_size"];
        if ($bytes < 1024) {
            $displaySize = $bytes . " B";
        } elseif ($bytes < 1024 * 1024) {
            $displaySize = round($bytes / 1024, 2) . " KB";
        } elseif ($bytes < 1024 * 1024 * 1024) {
            $displaySize = round($bytes / (1024 * 1024), 2) . " MB";
        } else {
            $displaySize = round($bytes / (1024 * 1024 * 1024), 2) . " GB";
        }

        echo "<tr>";
        echo "<td>" . htmlspecialchars($row["id"]) . "</td>";

        // In der Namensspalte stehen der bearbeitbare Basisname und die feste Extension;
        // außerdem wird ein Button für das Umbenennen dargestellt.
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

$stmt->close();
$conn->close();
?>
