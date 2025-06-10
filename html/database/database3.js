document.addEventListener("DOMContentLoaded", () => {
  // --- "Add Extra Info" Funktionalität ---
  const addExtraInfoBtn = document.querySelector('[data-action="add_extra_info"]');
  if (addExtraInfoBtn) {
    addExtraInfoBtn.addEventListener("click", function (e) {
      if (typeof window.hideCustomContextMenu === "function") {
        window.hideCustomContextMenu();
      }
      if (window.currentActiveRow) {
        const cells = window.currentActiveRow.querySelectorAll("td");
        if (cells.length >= 6) {
          const extraInfoCell = cells[5];
          startInlineExtraInfo(extraInfoCell);
        } else {
          alert("Zusatzinfo-Zelle nicht gefunden.");
        }
      } else {
        alert("Kein Datensatz selektiert.");
      }
    });
  }

  // --- "Move to Folder" Funktionalität ---
  const moveToFolderBtn = document.querySelector('[data-action="move_to_folder"]');
  if (moveToFolderBtn) {
    moveToFolderBtn.addEventListener("click", function (e) {
      if (typeof window.hideCustomContextMenu === "function") {
        window.hideCustomContextMenu();
      }
      showFolderPopup("move");
    });
  }

  // --- "Copy to Folder" Funktionalität ---
  const copyToFolderBtn = document.querySelector('[data-action="copy_to_folder"]');
  if (copyToFolderBtn) {
    copyToFolderBtn.addEventListener("click", function (e) {
      if (typeof window.hideCustomContextMenu === "function") {
        window.hideCustomContextMenu();
      }
      showFolderPopup("copy");
    });
  }

  // --- "Download" Funktionalität ---
  const downloadBtn = document.querySelector('[data-action="download"]');
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function (e) {
      if (typeof window.hideCustomContextMenu === "function") {
        window.hideCustomContextMenu();
      }
      let fileId = getFileIdFromActiveRow();
      if (!fileId) {
        alert("Keine gültige Datei-ID gefunden.");
        return;
      }
      // Erstelle die URL, die auf download_file.php zeigt und den Datei-ID-Parameter übergibt
      const downloadUrl = "../backend/download_file.php?id=" + encodeURIComponent(fileId);
      // Effektivste Methode: einen unsichtbaren Link erzeugen und simuliert klicken, um so den Download zu triggern
      const a = document.createElement("a");
      a.href = downloadUrl;
      // Der Browser übernimmt den Dateinamen aus den HTTP-Headern (Content-Disposition)
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
});

// Helferfunktion, um die Datei-ID aus der aktuell selektierten Zeile zu extrahieren
function getFileIdFromActiveRow() {
  if (window.currentActiveRow) {
    const nameTd = window.currentActiveRow.querySelector("td[data-id]");
    if (nameTd) {
      return nameTd.getAttribute("data-id");
    } else {
      const firstCell = window.currentActiveRow.querySelector("td");
      if (firstCell) {
        return firstCell.textContent.trim();
      }
    }
  }
  return null;
}

// =======================
// Funktion für "Add Extra Info" Inline-Bearbeitung
// =======================
function startInlineExtraInfo(cell) {
  const oldExtraInfo = cell.textContent.trim();
  cell.innerHTML = ""; // Zelle leeren

  // Erstelle ein Eingabefeld und setze den alten Text als Wert
  const input = document.createElement("input");
  input.type = "text";
  input.value = oldExtraInfo;
  input.className = "inline-extra-info-input";
  cell.appendChild(input);
  input.focus();

  // Erzeuge Bestätigungs- und Abbrechen-Buttons
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn extra-info-confirm";
  confirmBtn.textContent = "Confirm";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn extra-info-cancel";
  cancelBtn.textContent = "Cancel";
  cell.appendChild(confirmBtn);
  cell.appendChild(cancelBtn);

  // Erfasse Enter und Escape als Hotkeys
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmBtn.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelBtn.click();
    }
  });

  // Beim Bestätigen wird der neue Text an update_extra_info.php gesendet
  confirmBtn.addEventListener("click", function () {
    const newExtraInfo = input.value.trim();
    let fileId = getFileIdFromActiveRow();
    if (!fileId) {
      alert("Keine gültige Datei-ID gefunden.");
      cancelBtn.click();
      return;
    }
    const formData = new FormData();
    formData.append("id", fileId);
    formData.append("extra_info", newExtraInfo);
    fetch("../backend/update_extra_info.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert(data.message || "Zusatzinfo erfolgreich aktualisiert.");
          cell.textContent = newExtraInfo;
        } else {
          alert("Fehler: " + data.message);
          cell.textContent = oldExtraInfo;
        }
      })
      .catch((error) => {
        alert("Netzwerkfehler: " + error);
        cell.textContent = oldExtraInfo;
      });
  });

  // Beim Abbrechen wird der ursprüngliche Text wiederhergestellt
  cancelBtn.addEventListener("click", function () {
    cell.textContent = oldExtraInfo;
  });
}

// =======================
// Funktion für das Popup zur Ordnerauswahl (für Move/Copy)
// =======================
function showFolderPopup(action) {
  // Erstelle das Popup-Element
  let popup = document.createElement("div");
  popup.className = "folder-popup";
  //Einfache Inline-Stile (alternativ in einer externen CSS-Datei definieren)
  popup.style.position = "absolute";
  popup.style.background = "#4d0000";
  popup.style.border = "1px solid #ccc";
  popup.style.padding = "10px";
  popup.style.zIndex = 1000;

  // Positioniere das Popup rechts neben dem Kontextmenü
  const contextMenu = document.getElementById("customContextMenu");
  if (contextMenu) {
    const rect = contextMenu.getBoundingClientRect();
    popup.style.left = rect.right + 10 + "px";
    popup.style.top = rect.top + "px";
  } else {
    popup.style.left = "100px";
    popup.style.top = "100px";
  }

  popup.innerHTML = "<p><strong>Select target folder:</strong></p>";
  let listContainer = document.createElement("div");
  listContainer.className = "folder-list";
  listContainer.innerHTML = "Loading folders...";
  popup.appendChild(listContainer);
  document.body.appendChild(popup);

  // Hole die Ordnerliste via AJAX aus getFolders.php
  fetch("../backend/getFolders.php")
    .then((response) => response.json())
    .then((data) => {
      listContainer.innerHTML = "";
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((folder) => {
          let btn = document.createElement("button");
          btn.className = "folder-option";
          btn.style.display = "block";
          btn.style.margin = "5px 0";
          btn.textContent = folder;
          btn.addEventListener("click", function () {
            let fileId = getFileIdFromActiveRow();
            if (!fileId) {
              alert("Keine gültige Datei-ID gefunden.");
              if (popup.parentNode) popup.parentNode.removeChild(popup);
              return;
            }

            let url = "";
            if (action === "move") {
              url = "../backend/move_to_folder.php";
            } else if (action === "copy") {
              url = "../backend/copy_to_folder.php";
            }

            let formData = new FormData();
            formData.append("id", fileId);
            formData.append("target_folder", folder);

            fetch(url, {
              method: "POST",
              body: formData,
            })
              .then((response) => response.json())
              .then((result) => {
                alert(result.message);
                if (popup.parentNode) popup.parentNode.removeChild(popup);
              })
              .catch((error) => {
                alert("Netzwerkfehler: " + error);
                if (popup.parentNode) popup.parentNode.removeChild(popup);
              });
          });
          listContainer.appendChild(btn);
        });
      } else {
        listContainer.innerHTML = "Keine Ordner gefunden.";
      }
    })
    .catch((error) => {
      listContainer.innerHTML = "Fehler beim Laden der Ordner.";
    });

  // Schließe das Popup, falls außerhalb geklickt wird
  function outsideClickListener(event) {
    if (!popup.contains(event.target)) {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
      document.removeEventListener("click", outsideClickListener);
    }
  }
  setTimeout(() => {
    document.addEventListener("click", outsideClickListener);
  }, 0);
}
