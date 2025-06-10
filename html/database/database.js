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
            alert("Please enter a valid name");
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
                alert("Folder created successfully");
                folderModal.style.display = "none";
            } else {
                alert("Fehler: " + data.message);
            }
        })
        .catch(error => {
            alert("networkerror: " + error);
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
                alert("Scan successfull");
                scanButton.disabled = false;
                scanButton.innerText = "Scan manually";
            })
            .catch(error => {
                alert("error while scanning: " + error);
                scanButton.disabled = false;
                scanButton.innerText = "scan manually";
            });
    });

    // Store selected file types
    let selectedFileTypes = new Set();

    // Modified loadTypeOptions to maintain selections
    function loadTypeOptions() {
        fetch("../backend/get_allowed_file_types.php")
            .then(response => response.json())
            .then(data => {
                console.log("loaded datatypes:", data);
                const container = document.getElementById("typeOptionsContainer");
                const selectedBoxes = Array.from(document.querySelectorAll(".typeOption:checked")).map(cb => cb.value);
                selectedBoxes.forEach(value => selectedFileTypes.add(value));
                
                container.innerHTML = "";
                for (const [key, displayName] of Object.entries(data)) {
                    const label = document.createElement("label");
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.className = "typeOption";
                    checkbox.value = key;
                    checkbox.checked = selectedFileTypes.has(key);
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            selectedFileTypes.add(key);
                        } else {
                            selectedFileTypes.delete(key);
                        }
                    });
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(" " + displayName));
                    container.appendChild(label);
                }
            })
            .catch(error => {
                console.error("error while loading datatype options:", error);
            });
    }

    // Create function to load folder options
    function loadFolderOptions() {
        fetch("../backend/getFolders.php")
            .then(response => response.json())
            .then(data => {
                // Just log success, we don't need to do anything here
                console.log("loaded folders successfully");
            })
            .catch(error => {
                console.error("error while loading folders:", error);
            });
    }

    // Check URL parameters for folder filter and apply immediately
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('folder')) {
        document.getElementById('folderActive').checked = true;
        document.getElementById('folderInput').value = urlParams.get('folder');
        window.history.replaceState({}, '', window.location.pathname);
        // Immediately load the content with the folder filter
        loadDatabaseContent();
    } else {
        // Normal initial load if no folder parameter
        loadDatabaseContent();
    }

    function loadDatabaseContent() {
        let params = new URLSearchParams();

        if (document.getElementById("nameActive").checked) {
            const nameValue = document.getElementById("nameInput").value.trim();
            if (nameValue) params.append("name", nameValue);
        }
        
        if (document.getElementById("typeActive").checked) {
            const types = Array.from(document.querySelectorAll(".typeOption:checked")).map(el => el.value);
            if (types.length > 0) params.append("file_types", types.join(","));
        }
        
        if (document.getElementById("sizeActive").checked) {
            const sizeFrom = document.getElementById("sizeFrom").value;
            const sizeTo = document.getElementById("sizeTo").value;
            if (sizeFrom) params.append("size_from", sizeFrom);
            if (sizeTo) params.append("size_to", sizeTo);
        }
        
        if (document.getElementById("dateActive").checked) {
            const dateFrom = document.getElementById("dateFrom").value;
            const dateTo = document.getElementById("dateTo").value;
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
        }
        
        // Updated folder filter logic
        if (document.getElementById("folderActive").checked) {
            const folderInput = document.getElementById("folderInput").value.trim();
            if (folderInput) {
                // Split by newlines and filter empty lines
                const folders = folderInput.split('\n')
                    .map(f => f.trim())
                    .filter(f => f.length > 0);
                if (folders.length > 0) {
                    params.append("folders", folders.join(","));
                }
            }
        }

        const resultDiv = document.getElementById("result");
        resultDiv.innerHTML = "loading data...";

        let url = "../backend/load_data.php";
        if ([...params].length > 0) url += "?" + params.toString();

        fetch(url)
            .then(response => response.text())
            .then(data => {
                resultDiv.innerHTML = data;
                if (typeof attachRowContextMenuListeners === "function") {
                    attachRowContextMenuListeners();
                }
            })
            .catch(error => {
                resultDiv.innerHTML = "error while loading data: " + error;
            });
    }

    // Initial loads
    loadTypeOptions();
    loadFolderOptions();
    
    // Apply filter button event listener
    document.getElementById("applyFilterBtn").addEventListener("click", loadDatabaseContent);
});
