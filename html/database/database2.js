document.addEventListener("DOMContentLoaded", () => {
    // --- Kontextmenü & Inline-Editing via Rechtsklick ---
    let currentRenameElement = null;

    // Erstelle das individuelle Kontextmenü und füge es in den Body ein
    let customContextMenu = document.createElement("div");
    customContextMenu.id = "customContextMenu";
    customContextMenu.className = "custom-context-menu hidden";
    customContextMenu.innerHTML = `
        <button class="context-menu-item" data-action="rename"><span class="icon">✎</span> Change Name</button>
        <button class="context-menu-item" data-action="delete"><span class="delete-icon">🗑️</span> Delete File</button>
        <button class="context-menu-item placeholder">Placeholder</button>
    `;
    document.body.appendChild(customContextMenu);

    // Klick auf "Change Name" im Kontextmenü startet den Umbenennungsmodus
    customContextMenu.querySelector('[data-action="rename"]').addEventListener("click", function (e) {
        hideCustomContextMenu();
        if (currentRenameElement) {
            startInlineRename(currentRenameElement);
        }
    });

    // Klick auf "Delete File" im Kontextmenü startet den Löschvorgang
    customContextMenu.querySelector('[data-action="delete"]').addEventListener("click", function(e) {
        hideCustomContextMenu();
        if (!currentRenameElement) return;
        const parentTd = currentRenameElement.parentElement;
        let fileId = parentTd.getAttribute("data-id");
        if (!fileId) {
            alert("Datei-ID nicht gefunden.");
            return;
        }
        showConfirmDeleteModal(fileId);
    });

    // Globale Listener zum Verbergen des Kontextmenüs bei Klick außerhalb
    document.addEventListener("click", function(e) {
        if (!customContextMenu.classList.contains("hidden")) {
            hideCustomContextMenu();
        }
    });

    function showCustomContextMenu(x, y) {
        customContextMenu.style.left = x + "px";
        customContextMenu.style.top = y + "px";
        customContextMenu.classList.remove("hidden");
    }

    function hideCustomContextMenu() {
        customContextMenu.classList.add("hidden");
        // Entferne die Highlight-Klasse aus allen Zeilen, wenn das Menü verschwindet
        document.querySelectorAll("#result table tr.context-active").forEach(row => {
            row.classList.remove("context-active");
        });
    }

    // Delegierte Listener: Füge einen Rechtsklick-Listener zu allen Tabellenzeilen (im Result-Bereich) hinzu
    window.attachRowContextMenuListeners = function() {
        const rows = document.querySelectorAll("#result table tr");
        rows.forEach(row => {
            row.addEventListener("contextmenu", function(e) {
                e.preventDefault();
                let nameSpan = row.querySelector(".file-name");
                if (!nameSpan) return;
                // Entferne vorhandene Markierung von anderen Zeilen
                const previouslyActive = document.querySelector("#result table tr.context-active");
                if (previouslyActive) {
                    previouslyActive.classList.remove("context-active");
                }
                // Markiere die aktuelle Zeile und setze das Element zum Umbenennen/Löschen
                row.classList.add("context-active");
                currentRenameElement = nameSpan;
                showCustomContextMenu(e.pageX, e.pageY);
            });
        });
    };

    // Startet den Inline-Umbenennungsmodus für das Element (.file-name)
    function startInlineRename(nameSpan) {
        if (!nameSpan.getAttribute("data-original")) {
            nameSpan.setAttribute("data-original", nameSpan.innerText.trim());
        }
        nameSpan.contentEditable = true;
        nameSpan.focus();
        nameSpan.style.borderBottom = "1px solid #ffff66";

        // Erstelle die Bestätigen-/Abbrechen-Buttons
        let confirmBtn = document.createElement("button");
        confirmBtn.className = "btn rename-confirm";
        confirmBtn.innerText = "Confirm";
        let cancelBtn = document.createElement("button");
        cancelBtn.className = "btn rename-cancel";
        cancelBtn.innerText = "Cancel";

        nameSpan.parentElement.appendChild(confirmBtn);
        nameSpan.parentElement.appendChild(cancelBtn);

        // Keydown-Event: Enter bestätigt, Escape bricht ab
        nameSpan.addEventListener("keydown", function keyHandler(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                confirmBtn.click();
            } else if (e.key === "Escape") {
                e.preventDefault();
                cancelBtn.click();
            }
        });

        confirmBtn.addEventListener("click", function() {
            let newName = nameSpan.innerText.trim();
            let oldName = nameSpan.getAttribute("data-original") || "";
            if (newName === "") {
                alert("Der neue Name darf nicht leer sein.");
                nameSpan.innerText = oldName;
                return;
            }
            if (newName === oldName) {
                cleanupRename(nameSpan);
                return;
            }
            let parentTd = nameSpan.parentElement;
            let id = parentTd.getAttribute("data-id");
            let formData = new FormData();
            formData.append("id", id);
            formData.append("new_name", newName);
            fetch("../backend/update_filename.php", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    nameSpan.setAttribute("data-original", newName);
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

        cancelBtn.addEventListener("click", function() {
            let oldName = nameSpan.getAttribute("data-original") || "";
            nameSpan.innerText = oldName;
            cleanupRename(nameSpan);
        });
    }

    // Entfernt den Bearbeitungsmodus und die Zusatzelemente
    function cleanupRename(nameSpan) {
        nameSpan.contentEditable = false;
        nameSpan.style.borderBottom = "none";
        let confirmBtn = nameSpan.parentElement.querySelector(".rename-confirm");
        let cancelBtn = nameSpan.parentElement.querySelector(".rename-cancel");
        if (confirmBtn) confirmBtn.remove();
        if (cancelBtn) cancelBtn.remove();
    }

    // Funktion, um das Bestätigungsmodal für Datei-Löschung anzuzeigen
    function showConfirmDeleteModal(fileId) {
        // Modal-Overlay erstellen
        let modalOverlay = document.createElement("div");
        modalOverlay.id = "deleteConfirmModal";
        modalOverlay.style.position = "fixed";
        modalOverlay.style.top = "0";
        modalOverlay.style.left = "0";
        modalOverlay.style.width = "100%";
        modalOverlay.style.height = "100%";
        modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        modalOverlay.style.display = "flex";
        modalOverlay.style.alignItems = "center";
        modalOverlay.style.justifyContent = "center";
        modalOverlay.style.zIndex = "100";

        // Modal-Inhalt erstellen
        let modalContent = document.createElement("div");
        modalContent.style.backgroundColor = "#400d0d";
        modalContent.style.border = "2px solid #ff8c00";
        modalContent.style.padding = "20px";
        modalContent.style.borderRadius = "6px";
        modalContent.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
        modalContent.style.textAlign = "center";

        let message = document.createElement("p");
        message.innerText = "Are you sure?";

        let confirmBtn = document.createElement("button");
        confirmBtn.className = "btn";
        confirmBtn.innerText = "Confirm";

        let denyBtn = document.createElement("button");
        denyBtn.className = "btn";
        denyBtn.innerText = "Deny";

        modalContent.appendChild(message);
        modalContent.appendChild(confirmBtn);
        modalContent.appendChild(denyBtn);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Funktion, um Modal zu schließen und Event-Listener zu entfernen
        function closeModal() {
            document.body.removeChild(modalOverlay);
            document.removeEventListener("keydown", keyDownHandler);
        }

        // Deny: Klick oder Esc schließt Modal
        denyBtn.addEventListener("click", closeModal);

        function keyDownHandler(e) {
            if (e.key === "Escape") {
                e.preventDefault();
                closeModal();
            }
        }
        document.addEventListener("keydown", keyDownHandler);

        // Confirm-Klick: führt Löschung aus (keine zusätzliche Tastaturverknüpfung)
        confirmBtn.addEventListener("click", function() {
            closeModal();
            let formData = new FormData();
            formData.append("id", fileId);
            fetch("../backend/delete_file.php", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    removeTableRow(fileId);
                } else {
                    alert("Fehler: " + data.message);
                }
            })
            .catch(error => {
                alert("Netzwerkfehler: " + error);
            });
        });
    }

    // Funktion zum Entfernen der gelöschten Zeile aus der Tabelle
    function removeTableRow(fileId) {
        const targetTd = document.querySelector(`#result td[data-id="${fileId}"]`);
        if (targetTd) {
            targetTd.parentElement.remove();
        }
    }
});
