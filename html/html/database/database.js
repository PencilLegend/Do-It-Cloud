document.addEventListener("DOMContentLoaded", () => {
    // Referenzen für das Modal und zugehörige Elemente
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

    // Erstellen des Ordners beim Klick auf "Erstellen"
    modalCreateBtn.addEventListener("click", () => {
        const folderName = folderNameInput.value.trim();
        if (!folderName) {
            alert("Bitte geben Sie einen gültigen Ordnernamen ein.");
            return;
        }
        // Sende den Namen an das Backend
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

    // Optional: Erstelle Ordner durch Drücken der Enter-Taste im Eingabefeld
    folderNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            modalCreateBtn.click();
        }
    });

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

    // Zusammenbau der Filter-Parameter
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
                attachRowContextMenuListeners();  // Nachladen der Rechtsklick-Listener
                // Für den Fall, dass sich etwas ändert, laden wir die Typoptionen neu
                loadTypeOptions();
            })
            .catch(error => {
                resultDiv.innerHTML = "Fehler beim Laden der Daten: " + error;
            });
    });

    // ---------------------------
    // Neuer Teil: Kontextmenü und Inline-Editing via Rechtsklick
    // ---------------------------
    let currentRenameElement = null;

    // Erstelle das individuelle Kontextmenü und füge es in den Body ein
    let customContextMenu = document.createElement('div');
    customContextMenu.id = "customContextMenu";
    customContextMenu.className = "custom-context-menu hidden";
    customContextMenu.innerHTML = `
        <button class="context-menu-item" data-action="rename"><span class="icon">✎</span> Change Name</button>
        <button class="context-menu-item placeholder">Placeholder 1</button>
        <button class="context-menu-item placeholder">Placeholder 2</button>
    `;
    document.body.appendChild(customContextMenu);

    // Klick auf "Change Name" im Kontextmenü startet den Umbenennungsmodus
    customContextMenu.querySelector('[data-action="rename"]').addEventListener('click', function(e) {
        hideCustomContextMenu();
        if (currentRenameElement) {
            startInlineRename(currentRenameElement);
        }
    });

    // Globale Listener zum Verbergen des Kontextmenüs bei Klick außerhalb
    document.addEventListener('click', function(e) {
        if (!customContextMenu.classList.contains('hidden')) {
            hideCustomContextMenu();
        }
    });

    function showCustomContextMenu(x, y) {
        customContextMenu.style.left = x + "px";
        customContextMenu.style.top = y + "px";
        customContextMenu.classList.remove('hidden');
    }

    function hideCustomContextMenu() {
        customContextMenu.classList.add('hidden');
        // Entferne die Highlight-Klasse aus allen Zeilen, wenn das Menü verschwindet
        document.querySelectorAll('#result table tr.context-active').forEach(row => {
            row.classList.remove('context-active');
        });
    }

    // Delegierte Listener: Füge einen Rechtsklick-Listener zu allen Tabellenzeilen (im Result-Bereich) hinzu
    function attachRowContextMenuListeners() {
        const rows = document.querySelectorAll('#result table tr');
        rows.forEach(row => {
            row.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                let nameSpan = row.querySelector('.file-name');
                if (!nameSpan) return;
                // Entferne vorhandene Markierung von anderen Zeilen
                const previouslyActive = document.querySelector('#result table tr.context-active');
                if (previouslyActive) {
                    previouslyActive.classList.remove('context-active');
                }
                // Markiere die aktuelle Zeile
                row.classList.add('context-active');
                currentRenameElement = nameSpan;
                showCustomContextMenu(e.pageX, e.pageY);
            });
        });
    }

    // Startet den Inline-Umbenennungsmodus für das Element (.file-name)
    function startInlineRename(nameSpan) {
        if (!nameSpan.getAttribute('data-original')) {
            nameSpan.setAttribute('data-original', nameSpan.innerText.trim());
        }
        nameSpan.contentEditable = true;
        nameSpan.focus();
        nameSpan.style.borderBottom = "1px solid #ffff66";

        // Erstelle die Bestätigen-/Abbrechen-Buttons
        let confirmBtn = document.createElement('button');
        confirmBtn.className = "btn rename-confirm";
        confirmBtn.innerText = "Confirm";
        let cancelBtn = document.createElement('button');
        cancelBtn.className = "btn rename-cancel";
        cancelBtn.innerText = "Cancel";

        nameSpan.parentElement.appendChild(confirmBtn);
        nameSpan.parentElement.appendChild(cancelBtn);

        confirmBtn.addEventListener('click', function() {
            let newName = nameSpan.innerText.trim();
            let oldName = nameSpan.getAttribute('data-original') || "";
            if(newName === ""){
                alert("Der neue Name darf nicht leer sein.");
                nameSpan.innerText = oldName;
                return;
            }
            if(newName === oldName) {
                cleanupRename(nameSpan);
                return;
            }
            let parentTd = nameSpan.parentElement;
            let id = parentTd.getAttribute('data-id');
            let formData = new FormData();
            formData.append('id', id);
            formData.append('new_name', newName);
            fetch("../backend/update_filename.php", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if(data.success){
                    alert(data.message);
                    nameSpan.setAttribute('data-original', newName);
                } else {
                    alert("Fehler: " + data.message);
                    nameSpan.innerText = oldName;
                }
                cleanupRename(nameSpan);
            })
            .catch(error => {
                alert("Netzwerkfehler: " + error);
                nameSpan.innerText = oldName;
                cleanupRename(nameSpan);
            });
        });

        cancelBtn.addEventListener('click', function() {
            let oldName = nameSpan.getAttribute('data-original') || "";
            nameSpan.innerText = oldName;
            cleanupRename(nameSpan);
        });
    }

    // Entfernt den Bearbeitungsmodus und die Zusatzelemente
    function cleanupRename(nameSpan) {
        nameSpan.contentEditable = false;
        nameSpan.style.borderBottom = "none";
        let confirmBtn = nameSpan.parentElement.querySelector('.rename-confirm');
        let cancelBtn = nameSpan.parentElement.querySelector('.rename-cancel');
        if(confirmBtn) confirmBtn.remove();
        if(cancelBtn) cancelBtn.remove();
    }
});
