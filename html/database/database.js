document.addEventListener("DOMContentLoaded", () => {
    // --- Grundlegende Funktionen und Modale ---
    const createFolderBtn = document.getElementById("createFolderBtn");
    const folderModal = document.getElementById("folderModal");
    const modalCreateBtn = document.getElementById("modalCreateBtn");
    const modalCancelBtn = document.getElementById("modalCancelBtn");
    const folderNameInput = document.getElementById("folderNameInput");

    // Öffne das Modal bei Klick
    createFolderBtn.addEventListener("click", () => {
        folderModal.style.display = "flex";
        folderNameInput.value = "";
        folderNameInput.focus();
    });

    // Schließen des Modals bei "Abbrechen"
    modalCancelBtn.addEventListener("click", () => {
        folderModal.style.display = "none";
    });

    // Ordnererstellung über Backend
    modalCreateBtn.addEventListener("click", () => {
        const folderName = folderNameInput.value.trim();
        if (!folderName) {
            alert("Bitte geben Sie einen gültigen Ordnernamen ein.");
            return;
        }
        fetch("../backend/create_folder.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Ordner erfolgreich erstellt!");
                folderModal.style.display = "none";
            } else {
                alert("Fehler: " + data.message);
            }
        })
        .catch(error => {
            alert("Netzwerkfehler: " + error);
        });
    });

    // Erstellen des Ordners durch Drücken der Enter-Taste
    folderNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            modalCreateBtn.click();
        }
    });

    // --- Filter und Scan Funktionen ---
    // Toggle für den Hauptfilterbereich
    const filterToggle = document.getElementById("filterToggle");
    const mainFilterContainer = document.getElementById("mainFilterContainer");
    filterToggle.addEventListener("click", () => {
        mainFilterContainer.classList.toggle("hidden");
    });

    // Scan-Funktion
    const scanButton = document.getElementById("scanButton");
    scanButton.addEventListener("click", () => {
        scanButton.disabled = true;
        scanButton.innerText = "Scannen...";
        fetch("../backend/run_scan.php")
            .then(response => response.json())
            .then(data => {
                alert("Scan erfolgreich abgeschlossen");
                scanButton.disabled = false;
                scanButton.innerText = "Scan Manuell ausführen";
            })
            .catch(error => {
                alert("Fehler während des Scannens: " + error);
                scanButton.disabled = false;
                scanButton.innerText = "Scan Manuell ausführen";
            });
    });

    // Funktion, um die Dateityp-Optionen dynamisch zu laden
    function loadTypeOptions() {
        fetch("../backend/get_allowed_file_types.php")
            .then(response => response.json())
            .then(data => {
                console.log("Geladene Dateitypen:", data);
                const container = document.getElementById("typeOptionsContainer");
                container.innerHTML = "";
                for (const [key, displayName] of Object.entries(data)) {
                    const label = document.createElement("label");
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.className = "typeOption";
                    checkbox.value = key;
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(" " + displayName));
                    container.appendChild(label);
                }
            })
            .catch(error => {
                console.error("Fehler beim Laden der Dateityp-Optionen:", error);
            });
    }
    // Direkt beim Start laden
    loadTypeOptions();

    // NEU: Funktion, um die Ordner dynamisch aus /mnt/nas/ zu laden
    function loadFolderOptions() {
        fetch("../backend/getFolders.php")
            .then(response => response.json())
            .then(data => {
                console.log("Geladene Ordner:", data);
                const container = document.getElementById("folderFilterContainer");
                container.innerHTML = "";
                data.forEach(folder => {
                    const label = document.createElement("label");
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.className = "folderOption";
                    checkbox.value = folder;
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(" " + folder));
                    container.appendChild(label);
                });
            })
            .catch(error => {
                console.error("Fehler beim Laden der Ordner:", error);
            });
    }
    // Direkt beim Start laden
    loadFolderOptions();

    // Zusammenbau der Filter-Parameter und Laden der Daten
    document.getElementById("applyFilterBtn").addEventListener("click", () => {
        let params = new URLSearchParams();

        // Namensfilter
        if (document.getElementById("nameActive").checked) {
            const nameValue = document.getElementById("nameInput").value.trim();
            if (nameValue) params.append("name", nameValue);
        }
        // Dateitypfilter
        if (document.getElementById("typeActive").checked) {
            const types = Array.from(document.querySelectorAll(".typeOption:checked")).map(el => el.value);
            if (types.length > 0) params.append("file_types", types.join(","));
        }
        // Größenfilter
        if (document.getElementById("sizeActive").checked) {
            const sizeFrom = document.getElementById("sizeFrom").value;
            const sizeTo = document.getElementById("sizeTo").value;
            if (sizeFrom) params.append("size_from", sizeFrom);
            if (sizeTo) params.append("size_to", sizeTo);
        }
        // Datumsfilter
        if (document.getElementById("dateActive").checked) {
            const dateFrom = document.getElementById("dateFrom").value;
            const dateTo = document.getElementById("dateTo").value;
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
        }
        // Ordnerfilter
        if (document.getElementById("folderActive").checked) {
            const folders = Array.from(document.querySelectorAll(".folderOption:checked")).map(el => el.value);
            if (folders.length > 0) params.append("folders", folders.join(","));
        }

        const resultDiv = document.getElementById("result");
        resultDiv.innerHTML = "Lade Daten...";

        let url = "../backend/load_data.php";
        if ([...params].length > 0) url += "?" + params.toString();

        fetch(url)
            .then(response => response.text())
            .then(data => {
                resultDiv.innerHTML = data;
                // Falls das Kontextmenü (aus database2.js) geladen ist,
                // sollen die Rechtsklick-Listener neu angebracht werden.
                if (typeof attachRowContextMenuListeners === "function") {
                    attachRowContextMenuListeners();
                }
                // In jedem Fall: Typoptionen neu laden, falls sich etwas geändert hat.
                loadTypeOptions();
            })
            .catch(error => {
                resultDiv.innerHTML = "Fehler beim Laden der Daten: " + error;
            });
    });
});
