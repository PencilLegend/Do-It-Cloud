document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById("drop-zone");
    const progressContainer = document.getElementById("upload-progress");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const fileInput = document.getElementById("fileInput");

    // Funktion zum Laden der Ordner aus dem NAS via getFolders.php
    function loadFolders() {
        const folderSelect = document.getElementById("folderSelect");
        fetch("../backend/getFolders.php")
            .then(response => response.json())
            .then(data => {
                folderSelect.innerHTML = ""; // Vorherige Optionen löschen
                // Füge jede gefundene Ordner als Option hinzu
                data.forEach(folder => {
                    const option = document.createElement("option");
                    option.value = folder;
                    option.text = folder;
                    folderSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error("Fehler beim Laden der Ordner:", error);
            });
    }

    // Ordner-Liste beim Laden der Seite abrufen
    loadFolders();

    // Klick auf die Drop-Zone öffnet den Datei-Dialog
    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    // Drag & Drop Events
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const files = e.dataTransfer.files;
        handleFilesUpload(files);
    });

    // File-Input: Dateiauswahl über Dialog
    fileInput.addEventListener("change", (event) => {
        const files = event.target.files;
        handleFilesUpload(files);
    });

    // Dateien hochladen
    function handleFilesUpload(files) {
        const formData = new FormData();
        for (const file of files) {
            formData.append("upload[]", file);
        }
        // Ausgewählten Ordner hinzufügen
        const folder = document.getElementById("folderSelect").value;
        formData.append("folder", folder);

        // Fortschrittsanzeige einblenden, wenn Datei > 5MB (erste Datei)
        if (files.length > 0 && (files[0].size / (1024 * 1024)) > 5) {
            progressContainer.style.display = "block";
            progressBar.value = 0;
            progressText.innerText = "0%";
        }

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "../backend/upload.php", true);

        xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                progressBar.value = percent;
                progressText.innerText = percent + "%";
            }
        };

        xhr.onload = function () {
            if (xhr.status === 200) {
                alert(xhr.responseText);
                progressContainer.style.display = "none";
                // Reset File-Input für erneute Uploads
                fileInput.value = "";
            } else {
                alert("Upload fehlgeschlagen.");
            }
        };

        xhr.onerror = function () {
            alert("Netzwerkfehler.");
        };

        xhr.send(formData);
    }
});
