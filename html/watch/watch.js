document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const folder = urlParams.get('folder') || 'content';
    
    document.getElementById('currentFolder').textContent = `Media Viewer - ${folder}`;

    // Supported media types
    const mediaTypes = {
        video: ['.mp4', '.webm', '.ogg'],
        audio: ['.mp3', '.wav', '.ogg'],
        image: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    };

    function getFileType(filename) {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (mediaTypes.video.includes(ext)) return 'video';
        if (mediaTypes.audio.includes(ext)) return 'audio';
        if (mediaTypes.image.includes(ext)) return 'image';
        return null;
    }

    function getMediaIcon(type) {
        switch(type) {
            case 'video': return '🎥';
            case 'audio': return '🎵';
            case 'image': return '🖼️';
            default: return '📄';
        }
    }

    // Load media files
    fetch(`../backend/get_media_files.php?folder=${encodeURIComponent(folder)}`)
        .then(response => response.json())
        .then(files => {
            const mediaList = document.getElementById('mediaList');
            files.forEach(file => {
                const type = getFileType(file);
                if (type) {
                    const item = document.createElement('div');
                    item.className = 'media-item';
                    item.innerHTML = `
                        <div class="media-icon">${getMediaIcon(type)}</div>
                        <div class="media-name">${file}</div>
                    `;
                    item.addEventListener('click', () => playMedia(file, type));
                    mediaList.appendChild(item);
                }
            });
        });

    function playMedia(file, type) {
        const mediaPlayer = document.getElementById('mediaPlayer');
        const videoPlayer = document.getElementById('videoPlayer');
        const audioPlayer = document.getElementById('audioPlayer');
        const imageViewer = document.getElementById('imageViewer');

        // Hide all players
        videoPlayer.classList.add('hidden');
        audioPlayer.classList.add('hidden');
        imageViewer.classList.add('hidden');

        // Set source and show appropriate player
        const source = `../backend/stream_media.php?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`;
        
        switch(type) {
            case 'video':
                videoPlayer.src = source;
                videoPlayer.classList.remove('hidden');
                setupMediaControls(videoPlayer);
                break;
            case 'audio':
                audioPlayer.src = source;
                audioPlayer.classList.remove('hidden');
                setupMediaControls(audioPlayer);
                break;
            case 'image':
                imageViewer.src = source;
                imageViewer.classList.remove('hidden');
                setupImageZoom(imageViewer);
                break;
        }

        mediaPlayer.classList.remove('hidden');
    }

    function setupMediaControls(player) {
        // Keyboard controls for video/audio
        function handleKeyPress(e) {
            if (player.classList.contains('hidden')) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    player.currentTime = Math.max(0, player.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    player.currentTime = Math.min(player.duration, player.currentTime + 10);
                    break;
                case ' ':
                    e.preventDefault();
                    player.paused ? player.play() : player.pause();
                    break;
            }
        }

        document.addEventListener('keydown', handleKeyPress);
    }

    function setupImageZoom(img) {
        let scale = 1;
        
        img.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            scale = Math.max(1, Math.min(5, scale + delta));
            img.style.transform = `scale(${scale})`;
        };
    }

    // Close player
    document.querySelector('.close-player').addEventListener('click', () => {
        const mediaPlayer = document.getElementById('mediaPlayer');
        const videoPlayer = document.getElementById('videoPlayer');
        const audioPlayer = document.getElementById('audioPlayer');
        
        mediaPlayer.classList.add('hidden');
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        videoPlayer.src = '';  // Clear source
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        audioPlayer.src = '';  // Clear source
    });
});
