<?php
// Get the video file name from the URL, ensuring safety with basename() to prevent directory traversal.
if (!isset($_GET['file'])) {
    header("HTTP/1.1 400 Bad Request");
    exit("No file specified.");
}
$file = basename($_GET['file']);
$filePath = '/mnt/nas/content/' . $file;

if (!file_exists($filePath)) {
    header("HTTP/1.1 404 Not Found");
    exit("File not found.");
}

$size   = filesize($filePath);
$length = $size;
$start  = 0;
$end    = $size - 1;

// Open the file in binary read-only mode.
$fp = @fopen($filePath, 'rb');
if (!$fp) {
    header("HTTP/1.1 500 Internal Server Error");
    exit("Could not open file.");
}

header("Content-Type: video/mp4");
header("Accept-Ranges: bytes");

if (isset($_SERVER['HTTP_RANGE'])) {
    // Extract the range header string, e.g., "bytes=0-"
    $range = $_SERVER['HTTP_RANGE'];
    list(, $range) = explode('=', $range, 2);
    
    // Check for multiple ranges and ignore if found; we support only a single range.
    if (strpos($range, ',') !== false) {
        header("HTTP/1.1 416 Requested Range Not Satisfiable");
        header("Content-Range: bytes $start-$end/$size");
        exit;
    }
    
    // Split the range into start and end values.
    $range = explode('-', $range);
    $start = intval($range[0]);
    $end = (isset($range[1]) && is_numeric($range[1])) ? intval($range[1]) : $end;
    $length = ($end - $start) + 1;
    
    fseek($fp, $start);
    header("HTTP/1.1 206 Partial Content");
    header("Content-Range: bytes $start-$end/$size");
} else {
    header("HTTP/1.1 200 OK");
}

header("Content-Length: $length");

$buffer = 8192;
while(!feof($fp) && ($pos = ftell($fp)) <= $end) {
    if ($pos + $buffer > $end) {
        // Adjust buffer for the last chunk.
        $buffer = $end - $pos + 1;
    }
    echo fread($fp, $buffer);
    flush();
}
fclose($fp);
exit;
