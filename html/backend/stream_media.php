<?php
if (!isset($_GET['file']) || !isset($_GET['folder'])) {
    header("HTTP/1.1 400 Bad Request");
    exit("No file or folder specified.");
}

$folder = trim($_GET['folder'], '/');
$file = basename($_GET['file']);
$filePath = '/mnt/nas/' . $folder . '/' . $file;

if (!file_exists($filePath)) {
    header("HTTP/1.1 404 Not Found");
    exit("File not found.");
}

// Get MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $filePath);
finfo_close($finfo);

$size = filesize($filePath);
$length = $size;
$start = 0;
$end = $size - 1;

header("Accept-Ranges: bytes");
header("Content-Type: $mimeType");

// Handle range requests for video/audio streaming
if (isset($_SERVER['HTTP_RANGE'])) {
    $range = $_SERVER['HTTP_RANGE'];
    list(, $range) = explode('=', $range, 2);
    
    if (strpos($range, ',') !== false) {
        header("HTTP/1.1 416 Requested Range Not Satisfiable");
        header("Content-Range: bytes $start-$end/$size");
        exit;
    }
    
    if ($range == '-') {
        $start = $size - substr($range, 1);
    } else {
        $range = explode('-', $range);
        $start = $range[0];
        $end = (isset($range[1]) && is_numeric($range[1])) ? min($range[1], $end) : $end;
    }
    
    if ($start > $end || $start >= $size || $end >= $size) {
        header("HTTP/1.1 416 Requested Range Not Satisfiable");
        header("Content-Range: bytes $start-$end/$size");
        exit;
    }
    
    $length = ($end - $start) + 1;
    fseek($fp, $start);
    header("HTTP/1.1 206 Partial Content");
    header("Content-Range: bytes $start-$end/$size");
}

header("Content-Length: $length");

// Output file in chunks
$handle = fopen($filePath, 'rb');
$buffer = 8192;
$total = 0;

fseek($handle, $start);
while (!feof($handle) && $total < $length) {
    $remainingBytes = $length - $total;
    $readBytes = min($buffer, $remainingBytes);
    echo fread($handle, $readBytes);
    $total += $readBytes;
    flush();
}
fclose($handle);
exit;
