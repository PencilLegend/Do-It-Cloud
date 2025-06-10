<?php
header('Content-Type: application/json');
$allowed = [
    "jpeg"  => "JPEG",
    "png"   => "PNG",
    "gif"   => "GIF",
    "bmp"   => "BMP",
    "webp"  => "WEBP",
    "mp4"   => "MP4",
    "mpeg"  => "MP3",
    "txt"   => "TXT",
    "csv"   => "CSV",
    "pdf"   => "PDF",
    "doc"   => "DOC",
    "docx"  => "DOCX",
    "xls"   => "XLS",
    "xlsx"  => "XLSX",
    "ppt"   => "PPT",
    "pptx"  => "PPTX",
    "exe"   => "EXE"
];
echo json_encode($allowed);
?>
