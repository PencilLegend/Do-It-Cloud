<?php
$nasBasePath = '/mnt/nas/'; // Basisordner des NAS

if (!empty($_FILES['upload']) && isset($_POST['folder'])) {

    // Sicherer Ordnername und Überprüfung
    $folder = basename($_POST['folder']);
    $allowedFolders = ['temp', 'vids', 'txt'];

    if (!in_array($folder, $allowedFolders)) {
        echo "Ungültiger Ordner.";
        exit;
    }

    // Zielverzeichnis definieren und erstellen, falls nicht vorhanden
    $uploadDir = $nasBasePath . $folder . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Liste erlaubter MIME-Typen
    $allowedMimes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/bmp', 
        'image/webp',
        'video/mp4', 
        'audio/mpeg', // für MP3 (gängig: audio/mpeg)
        'text/plain', 
        'text/csv',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    foreach ($_FILES['upload']['tmp_name'] as $key => $tmpName) {
        // Überprüfe auf Upload-Fehler
        if ($_FILES['upload']['error'][$key] !== UPLOAD_ERR_OK) {
            echo "Fehler bei der Übertragung von " . basename($_FILES['upload']['name'][$key]) . ".\n";
            continue;
        }
        
        $fileName   = basename($_FILES['upload']['name'][$key]);
        $uploadFile = $uploadDir . $fileName;
        
        // Dateiinformationen: Typ und Größe
        $fileType = mime_content_type($tmpName);
        $fileSize = $_FILES['upload']['size'][$key];

        if ($fileSize > 5000 * 1024 * 1024) { // 500 MB Limit
            echo "Die Datei $fileName ist zu groß.\n";
            continue;
        }

        if (!in_array($fileType, $allowedMimes)) {
            echo "Ungültiger Dateityp für $fileName.\n";
            continue;
        }

        if (move_uploaded_file($tmpName, $uploadFile)) {
            echo "Datei $fileName wurde erfolgreich in den Ordner $folder hochgeladen.\n";
        } else {
            echo "Fehler beim Hochladen von $fileName.\n";
        }
    }

    // Starte den Scan nach Abschluss des Uploads
    exec("python3 /var/www/html/backend/scan.py");
} else {
    echo "Keine Datei hochgeladen oder kein Ordner ausgewählt.\n";
}
?>
