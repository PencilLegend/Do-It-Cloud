document.addEventListener("DOMContentLoaded", () => {
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
                attachEditListeners();  // Nachladen der Edit-Listener
                // Für den Fall, dass sich etwas ändert, laden wir die Typoptionen neu
                loadTypeOptions();
            })
            .catch(error => {
                resultDiv.innerHTML = "Fehler beim Laden der Daten: " + error;
            });
    });

    // Funktion zum Anhängen der Edit-Listener für Inline-Editing
    function attachEditListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                let nameSpan = this.parentElement.querySelector('.file-name');
                if (!nameSpan.getAttribute('data-original')) {
                    nameSpan.setAttribute('data-original', nameSpan.innerText.trim());
                }
                nameSpan.contentEditable = true;
                nameSpan.focus();
                nameSpan.style.borderBottom = "1px solid #ffff66";
            });
        });
        
        document.querySelectorAll('.file-name').forEach(span => {
            span.addEventListener('keypress', function(e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.blur();
                }
            });
            span.addEventListener('blur', function(e) {
                let newName = this.innerText.trim();
                let oldName = this.getAttribute('data-original') || "";
                this.contentEditable = false;
                this.style.borderBottom = "none";
                if(newName === "") {
                    alert("Der neue Name darf nicht leer sein.");
                    this.innerText = oldName;
                    return;
                }
                if(newName === oldName) return;
                let parentTd = this.parentElement;
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
                        this.setAttribute('data-original', newName);
                    } else {
                        alert("Fehler: " + data.message);
                        this.innerText = oldName;
                    }
                })
                .catch(error => {
                    alert("Netzwerkfehler: " + error);
                    this.innerText = oldName;
                });
            });
        });
    }

    // Falls bereits Daten geladen wurden, direkt Edit-Listener anhängen
    attachEditListeners();
});
