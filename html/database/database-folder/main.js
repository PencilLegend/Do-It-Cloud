document.addEventListener("DOMContentLoaded", () => {
    // Toggle for main filter container
    const filterToggle = document.getElementById("filterToggle");
    const mainFilterContainer = document.getElementById("mainFilterContainer");
    
    filterToggle.addEventListener("click", () => {
        mainFilterContainer.classList.toggle("hidden");
    });

    // Scan button functionality
    const scanButton = document.getElementById("scanButton");
    scanButton.addEventListener("click", () => {
        scanButton.disabled = true;
        scanButton.innerText = "Scanning...";
        
        fetch("../../backend/run_folder_scan.php")
            .then(response => response.json())
            .then(data => {
                alert("Folder scan completed successfully");
                scanButton.disabled = false;
                scanButton.innerText = "Scan Folders";
                loadFolderData(); // Reload the data after scanning
            })
            .catch(error => {
                alert("Error during folder scan: " + error);
                scanButton.disabled = false;
                scanButton.innerText = "Scan Folders";
            });
    });

    // Apply filter button functionality
    document.getElementById("applyFilterBtn").addEventListener("click", () => {
        loadFolderData();
    });

    // Initial data load
    loadFolderData();

    function loadFolderData() {
        let params = new URLSearchParams();

        // Name filter
        if (document.getElementById("nameActive").checked) {
            const nameValue = document.getElementById("nameInput").value.trim();
            if (nameValue) params.append("name", nameValue);
        }

        // Size filter
        if (document.getElementById("sizeActive").checked) {
            const sizeFrom = document.getElementById("sizeFrom").value;
            const sizeTo = document.getElementById("sizeTo").value;
            if (sizeFrom) params.append("size_from", sizeFrom);
            if (sizeTo) params.append("size_to", sizeTo);
        }

        // Date filter
        if (document.getElementById("dateActive").checked) {
            const dateFrom = document.getElementById("dateFrom").value;
            const dateTo = document.getElementById("dateTo").value;
            if (dateFrom) params.append("date_from", dateFrom);
            if (dateTo) params.append("date_to", dateTo);
        }

        // Parent folder filter
        if (document.getElementById("parentFolderActive").checked) {
            const parentFolder = document.getElementById("parentFolderInput").value.trim();
            if (parentFolder) params.append("parent_folder", parentFolder);
        }

        const resultDiv = document.getElementById("result");
        resultDiv.innerHTML = "Loading folder data...";

        let url = "../../backend/load_folders.php";
        if ([...params].length > 0) url += "?" + params.toString();

        return fetch(url)
            .then(response => response.text())
            .then(data => {
                resultDiv.innerHTML = data;
                attachContextMenuListeners();
            })
            .catch(error => {
                resultDiv.innerHTML = "Error loading folder data: " + error;
            });
    }

    // Add context menu to DOM
    let customContextMenu = document.createElement("div");
    customContextMenu.id = "customContextMenu";
    customContextMenu.className = "custom-context-menu hidden";
    customContextMenu.innerHTML = `
        <button class="context-menu-item" data-action="delete"><span class="delete-icon">🗑️</span> Delete Folder</button>
        <button class="context-menu-item" data-action="stats"><span class="icon">📊</span> Show Statistics</button>
        <button class="context-menu-item" data-action="view"><span class="icon">📂</span> View Content</button>
        <button class="context-menu-item" data-action="watch"><span class="icon">🎬</span> Watch Content</button>
    `;
    document.body.appendChild(customContextMenu);

    // Context menu event handlers
    customContextMenu.querySelector('[data-action="delete"]').addEventListener("click", function() {
        hideCustomContextMenu();
        if (window.currentActiveRow) {
            const path = window.currentActiveRow.querySelector("td[data-path]").getAttribute("data-path");
            showConfirmDeleteModal(path);
        }
    });

    customContextMenu.querySelector('[data-action="stats"]').addEventListener("click", function() {
        hideCustomContextMenu();
        if (window.currentActiveRow) {
            const path = window.currentActiveRow.querySelector("td[data-path]").getAttribute("data-path");
            showStatisticsModal(path);
        }
    });

    // Add View Content handler
    customContextMenu.querySelector('[data-action="view"]').addEventListener("click", function() {
        hideCustomContextMenu();
        if (window.currentActiveRow) {
            const path = window.currentActiveRow.querySelector("td[data-path]").getAttribute("data-path");
            window.location.href = '../database.html?folder=' + encodeURIComponent(path);
        }
    });

    // Add Watch Content handler
    customContextMenu.querySelector('[data-action="watch"]').addEventListener("click", function() {
        hideCustomContextMenu();
        if (window.currentActiveRow) {
            const path = window.currentActiveRow.querySelector("td[data-path]").getAttribute("data-path");
            window.location.href = '../../watch/watch.html?folder=' + encodeURIComponent(path);
        }
    });

    // Close context menu when clicking outside
    document.addEventListener("click", function(e) {
        if (!customContextMenu.contains(e.target)) {
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
        document.querySelectorAll("#result table tr.context-active").forEach(row => {
            row.classList.remove("context-active");
        });
    }

    // Add context menu to table rows after loading data
    function attachContextMenuListeners() {
        const rows = document.querySelectorAll("#result table tr");
        rows.forEach(row => {
            row.addEventListener("contextmenu", function(e) {
                e.preventDefault();
                let pathCell = row.querySelector("td[data-path]");
                if (!pathCell) return;

                const previouslyActive = document.querySelector("#result table tr.context-active");
                if (previouslyActive) {
                    previouslyActive.classList.remove("context-active");
                }

                row.classList.add("context-active");
                window.currentActiveRow = row;
                showCustomContextMenu(e.pageX, e.pageY);
            });
        });
    }

    function showConfirmDeleteModal(folderPath) {
        let modalOverlay = document.createElement("div");
        modalOverlay.className = "modal-overlay";
        
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <p>Are you sure you want to delete this folder and ALL its contents?</p>
                <p class="warning">This action cannot be undone!</p>
                <div class="modal-buttons">
                    <button class="btn deny">Deny</button>
                    <button class="btn confirm">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);

        modalOverlay.querySelector(".deny").addEventListener("click", () => {
            modalOverlay.remove();
        });

        modalOverlay.querySelector(".confirm").addEventListener("click", () => {
            fetch("../../backend/delete_folder.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: folderPath })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadFolderData(); // Reload the folder list
                    alert("Folder deleted successfully");
                } else {
                    alert("Error: " + data.message);
                }
                modalOverlay.remove();
            })
            .catch(error => {
                alert("Network error: " + error);
                modalOverlay.remove();
            });
        });
    }

    function showStatisticsModal(folderPath) {
        let modalOverlay = document.createElement("div");
        modalOverlay.className = "modal-overlay";
        
        modalOverlay.innerHTML = `
            <div class="modal-content statistics">
                <h3>Folder Statistics</h3>
                <div id="statsContent">Loading statistics...</div>
                <div class="chart-container">
                    <canvas id="pieChart"></canvas>
                </div>
                <button class="btn close">Close</button>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);

        fetch("../../backend/get_folder_stats.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: folderPath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const statsContent = modalOverlay.querySelector("#statsContent");
                statsContent.innerHTML = `
                    <div class="stats-summary">
                        <p><strong>Subfolders:</strong> ${data.subfolders}</p>
                        <p><strong>Total files:</strong> ${data.totalFiles}</p>
                    </div>
                `;
                
                if (data.totalFiles > 0) {
                    // Create pie chart using Chart.js
                    const ctx = modalOverlay.querySelector("#pieChart").getContext("2d");
                    new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: Object.keys(data.fileTypes),
                            datasets: [{
                                data: Object.values(data.fileTypes),
                                backgroundColor: [
                                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                                    '#9966FF', '#FF9F40', '#FF6384', '#36A2EB'
                                ]
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'right',
                                    labels: {
                                        color: '#ffff66'
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'File Type Distribution (%)',
                                    color: '#ffff66'
                                }
                            }
                        }
                    });
                } else {
                    modalOverlay.querySelector("#pieChart").style.display = 'none';
                    statsContent.innerHTML += '<p>No files found in this folder.</p>';
                }
            } else {
                modalOverlay.querySelector("#statsContent").innerHTML = 
                    `<p class="error">Error loading statistics: ${data.message}</p>`;
            }
        })
        .catch(error => {
            modalOverlay.querySelector("#statsContent").innerHTML = 
                `<p class="error">Error: ${error}</p>`;
        });

        modalOverlay.querySelector(".close").addEventListener("click", () => {
            modalOverlay.remove();
        });
    }
});
