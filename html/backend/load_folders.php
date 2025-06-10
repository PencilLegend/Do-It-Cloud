<?php
header("Content-Type: text/html; charset=utf-8");
ini_set('display_errors', 1);
error_reporting(E_ALL);

$host = "localhost";
$user = "root";
$password = "password";
$database = "uploads";

$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conditions = [];
$params = [];
$param_types = "";

// Filter: Name
if (isset($_GET['name']) && $_GET['name'] !== "") {
    $conditions[] = "name LIKE ?";
    $params[] = "%" . $_GET['name'] . "%";
    $param_types .= "s";
}

// Filter: Size
if (isset($_GET['size_from']) && is_numeric($_GET['size_from'])) {
    $sizeFromMB = floatval($_GET['size_from']);
    $sizeFromBytes = $sizeFromMB * 1024 * 1024;
    $conditions[] = "size >= ?";
    $params[] = $sizeFromBytes;
    $param_types .= "d";
}
if (isset($_GET['size_to']) && is_numeric($_GET['size_to'])) {
    $sizeToMB = floatval($_GET['size_to']);
    $sizeToBytes = $sizeToMB * 1024 * 1024;
    $conditions[] = "size <= ?";
    $params[] = $sizeToBytes;
    $param_types .= "d";
}

// Filter: Date
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

// Filter: Parent folder
if (isset($_GET['parent_folder']) && $_GET['parent_folder'] !== "") {
    $conditions[] = "parent_folder = ?";
    $params[] = $_GET['parent_folder'];
    $param_types .= "s";
}

$where_clause = "";
if (!empty($conditions)) {
    $where_clause = "WHERE " . implode(" AND ", $conditions);
}

$sql = "SELECT * FROM folders $where_clause ORDER BY depth ASC, name ASC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo "Query preparation error: " . $conn->error;
    exit;
}
if (!empty($params)) {
    $stmt->bind_param($param_types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

echo "<table>";
echo "<tr>
        <th>Name</th>
        <th>Path</th>
        <th>Size</th>
        <th>Files</th>
        <th>Modified</th>
        <th>Parent</th>
      </tr>";

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Format size
        $bytes = $row["size"];
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
        echo "<td data-path='" . htmlspecialchars($row["path"]) . "'>" . 
             str_repeat("&nbsp;&nbsp;&nbsp;&nbsp;", $row["depth"]) . 
             "📁 " . htmlspecialchars($row["name"]) . "</td>";
        echo "<td>" . htmlspecialchars($row["path"]) . "</td>";
        echo "<td>" . htmlspecialchars($displaySize) . "</td>";
        echo "<td>" . htmlspecialchars($row["file_count"]) . "</td>";
        echo "<td>" . htmlspecialchars($row["modification_date"]) . "</td>";
        echo "<td>" . htmlspecialchars($row["parent_folder"]) . "</td>";
        echo "</tr>";
    }
} else {
    echo "<tr><td colspan='6'>No folders found.</td></tr>";
}
echo "</table>";

$stmt->close();
$conn->close();
?>
