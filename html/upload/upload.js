document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById("drop-zone");
    const progressContainer = document.getElementById("upload-progress");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const fileInput = document.getElementById("fileInput");

    // Funktion zum Laden der Ordner aus dem NAS via getFolders.php
    function loadFolders() {
        const folderSelect = document.getElementById("folderSelect");
        const foldersList = document.getElementById("foldersList");
        
        fetch("../backend/getFolders.php")
            .then(response => response.json())
            .then(data => {
                // Fill dropdown with root folders
                folderSelect.innerHTML = "";
                data.rootFolders.forEach(folder => {
                    const option = document.createElement("option");
                    option.value = folder;
                    option.text = folder;
                    folderSelect.appendChild(option);
                });

                // Fill datalist with all folders
                foldersList.innerHTML = "";
                data.allFolders.forEach(folder => {
                    const option = document.createElement("option");
                    option.value = folder;
                    foldersList.appendChild(option);
                });
            })
            .catch(error => {
                console.error("Error loading folders:", error);
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

    // Add toggle for custom path input
    document.getElementById("togglePathInput").addEventListener("click", function() {
        const customPathDiv = document.getElementById("customPathInput");
        const isHidden = customPathDiv.style.display === "none";
        customPathDiv.style.display = isHidden ? "block" : "none";
        this.textContent = isHidden ? "Use Dropdown" : "Custom Path";
    });

    // Dateien hochladen
    function handleFilesUpload(files) {
        const formData = new FormData();
        for (const file of files) {
            formData.append("upload[]", file);
        }
        
        // Get folder path from either dropdown or custom input
        const customPathInput = document.getElementById("folderPath");
        const folder = customPathInput.style.display !== "none" && customPathInput.value
            ? customPathInput.value
            : document.getElementById("folderSelect").value;
            
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
