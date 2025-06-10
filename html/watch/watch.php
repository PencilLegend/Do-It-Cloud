<?php
// Define the video directory on your NAS
$videoDir = '/mnt/nas/content';

// Function to fetch list of .mp4 files
function getVideoFiles($dir) {
    $files = [];
    if (is_dir($dir)) {
        foreach (scandir($dir) as $file) {
            // Only add .mp4 files (case-insensitive)
            if (stripos($file, '.mp4') !== false) {
                $files[] = $file;
            }
        }
    }
    return $files;
}

$videos = getVideoFiles($videoDir);
$playing = isset($_GET['play']) ? basename($_GET['play']) : null;
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Video Watch</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    h1 { color: #333; }
    ul { list-style-type: none; padding: 0; }
    li { margin: 8px 0; }
    a { text-decoration: none; color: #0066cc; }
    a:hover { text-decoration: underline; }
    #playerContainer { margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Available Videos</h1>
  <p>all videos located in the content folder will be listed here</p>
  <ul id="videoList">
    <?php foreach ($videos as $video): ?>
      <li>
        <a href="?play=<?php echo urlencode($video); ?>">
          <?php echo htmlspecialchars($video); ?>
        </a>
      </li>
    <?php endforeach; ?>
  </ul>

  <?php if ($playing): ?>
    <div id="playerContainer">
      <h2>Now Playing: <?php echo htmlspecialchars($playing); ?></h2>
      <video id="videoPlayer" width="1280" height="720" controls>
        <source src="stream.php?file=<?php echo urlencode($playing); ?>" type="video/mp4">
        Your browser does not support HTML5 video.
      </video>
    </div>
  <?php endif; ?>
</body>
</html>
