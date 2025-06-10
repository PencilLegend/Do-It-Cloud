document.addEventListener("DOMContentLoaded", () => {
  // Globale Variable für die aktuell selektierte Tabellenzeile
  window.currentActiveRow = null;
  let currentRenameElement = null;

  let customContextMenu = document.createElement("div");
  customContextMenu.id = "customContextMenu";
  customContextMenu.className = "custom-context-menu hidden";
  // Aktualisiere den Platzhalter-Button zu einem Button für "Add Extra Info"
  // invisible unicode icon at the download button making it better (before ⭳)
  customContextMenu.innerHTML = `
      <button class="context-menu-item" data-action="rename"><span class="icon">✎</span> Change Name</button>
      <button class="context-menu-item" data-action="delete"><span class="delete-icon">🗑️</spaan> delete File</button>
      <button class="context-menu-item" data-action="add_extra_info"><span class="icon">ℹ️</span> add Extra Info</button>
      <button class="context-menu-item" data-action="move_to_folder"><span class="icon">📁</span> Move to Folder</button>
      <button class="context-menu-item" data-action="copy_to_folder"><span class="icon">📄</span> Copy to Folder</button>
      <button class="context-menu-item" data-action="download"><span class="icon">⠀⭳</span> Download</button> 

  `;
  document.body.appendChild(customContextMenu);

  // Event Listener für den "Change Name"-Button
  customContextMenu
    .querySelector('[data-action="rename"]')
    .addEventListener("click", function (e) {
      hideCustomContextMenu();
      if (currentRenameElement) {
        startInlineRename(currentRenameElement);
      }
    });

  // Event Listener für den "Delete File"-Button
  customContextMenu
    .querySelector('[data-action="delete"]')
    .addEventListener("click", function (e) {
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

  // Den Button "Add Extra Info" wird absichtlich hier **nicht** belegt,
  // da dessen Funktionalität in database3.js implementiert wird.

  // Schließt das Kontextmenü, wenn außerhalb geklickt wird
  document.addEventListener("click", function (e) {
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
    document
      .querySelectorAll("#result table tr.context-active")
      .forEach((row) => {
        row.classList.remove("context-active");
      });
  }

  // Diese Funktion wird global zur Verfügung gestellt, damit andere JS-Dateien
  // (z. B. database3.js) sie aufrufen können.
  window.attachRowContextMenuListeners = function () {
    const rows = document.querySelectorAll("#result table tr");
    rows.forEach((row) => {
      row.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        let nameSpan = row.querySelector(".file-name");
        if (!nameSpan) return;

        // Entferne vorherige Markierung, falls vorhanden
        const previouslyActive = document.querySelector(
          "#result table tr.context-active"
        );
        if (previouslyActive) {
          previouslyActive.classList.remove("context-active");
        }

        row.classList.add("context-active");
        window.currentActiveRow = row; // Global speichern
        currentRenameElement = nameSpan;
        showCustomContextMenu(e.pageX, e.pageY);
      });
    });
  };

  function startInlineRename(nameSpan) {
    if (!nameSpan.getAttribute("data-original")) {
      nameSpan.setAttribute("data-original", nameSpan.innerText.trim());
    }
    nameSpan.contentEditable = true;
    nameSpan.focus();
    nameSpan.classList.add("inline-rename");

    let confirmBtn = document.createElement("button");
    confirmBtn.className = "btn rename-confirm";
    confirmBtn.innerText = "Confirm";
    let cancelBtn = document.createElement("button");
    cancelBtn.className = "btn rename-cancel";
    cancelBtn.innerText = "Cancel";

    nameSpan.parentElement.appendChild(confirmBtn);
    nameSpan.parentElement.appendChild(cancelBtn);

    nameSpan.addEventListener("keydown", function keyHandler(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmBtn.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelBtn.click();
      }
    });

    confirmBtn.addEventListener("click", function () {
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
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert(data.message);
            nameSpan.setAttribute("data-original", newName);
          } else {
            alert("Fehler: " + data.message);
            nameSpan.innerText = oldName;
          }
          cleanupRename(nameSpan);
        })
        .catch((error) => {
          alert("Netzwerkfehler: " + error);
          nameSpan.innerText = oldName;
          cleanupRename(nameSpan);
        });
    });

    cancelBtn.addEventListener("click", function () {
      let oldName = nameSpan.getAttribute("data-original") || "";
      nameSpan.innerText = oldName;
      cleanupRename(nameSpan);
    });
  }

  function cleanupRename(nameSpan) {
    nameSpan.contentEditable = false;
    nameSpan.classList.remove("inline-rename");
    let confirmBtn = nameSpan.parentElement.querySelector(".rename-confirm");
    let cancelBtn = nameSpan.parentElement.querySelector(".rename-cancel");
    if (confirmBtn) confirmBtn.remove();
    if (cancelBtn) cancelBtn.remove();
  }

  function showConfirmDeleteModal(fileId) {
    let modalOverlay = document.createElement("div");
    modalOverlay.id = "deleteConfirmModal";
    modalOverlay.classList.add("modal-overlay");

    let modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

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

    function closeModal() {
      document.body.removeChild(modalOverlay);
      document.removeEventListener("keydown", keyDownHandler);
    }

    denyBtn.addEventListener("click", closeModal);

    function keyDownHandler(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    }
    document.addEventListener("keydown", keyDownHandler);

    confirmBtn.addEventListener("click", function () {
      closeModal();
      let formData = new FormData();
      formData.append("id", fileId);
      fetch("../backend/delete_file.php", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert(data.message);
            removeTableRow(fileId);
          } else {
            alert("Fehler: " + data.message);
          }
        })
        .catch((error) => {
          alert("Netzwerkfehler: " + error);
        });
    });
  }

  function removeTableRow(fileId) {
    const targetTd = document.querySelector(`#result td[data-id="${fileId}"]`);
    if (targetTd) {
      targetTd.parentElement.remove();
    }
  }

  // Stelle sicher, dass hideCustomContextMenu global verfügbar ist
  window.hideCustomContextMenu = hideCustomContextMenu;
});
