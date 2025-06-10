document.addEventListener("DOMContentLoaded", () => {
  /**
   * Erzeugt eine Zufallskoordinate mit Bias, sodass mehr Werte an den Rändern (nahe 0 oder 100)
   * und weniger in der Mitte erzeugt werden.
   * @param {number} exp - Der Exponent, der den Grad des Bias beeinflusst (höher → mehr Randwerte).
   * @returns {number} - Ein Wert zwischen 0 und 100.
   */
  function generateEdgeBiased(exp) {
    const r = Math.random();
    // Mit 50% Wahrscheinlichkeit wird der Wert in Richtung 0 oder 100 gezogen.
    if (Math.random() < 0.5) {
      return Math.pow(r, exp) * 50; // Werte zwischen 0 und 50, stärke Gewichtung Richtung 0.
    } else {
      return 50 + (1 - Math.pow(r, exp)) * 50; // Werte zwischen 50 und 100, stärke Gewichtung Richtung 100.
    }
  }

  /**
   * Generiert zufällig Punkte (als span-Elemente) in einem gegebenen Container und passt deren
   * Größe, Position und Farbe anhand der übergebenen Optionen an.
   * 
   * Optionen:
   * - count: Anzahl der zu generierenden Punkte.
   * - minSize: Minimale Größe der Punkte in Pixel.
   * - maxSize: Maximale Größe der Punkte in Pixel.
   * - baseHue: Basis-Hue-Wert (Farbton) in HSL für den Hintergrund.
   * - baseS: Basis-Sättigung (Saturation) in Prozent in HSL.
   * - baseL: Basis-Helligkeit (Lightness) in Prozent in HSL.
   * - maxDiff: Maximale Abweichung (in Prozentpunkten) der Helligkeit vom Basiswert.
   *            Je höher dieser Wert, desto größer die Farbvariation.
   * - exponent: Exponent, der den Bias bei der Positionierung bestimmt.
   * - exclusivelyDarker: Wenn true, werden die Punkte ausschließlich dunkler als baseL generiert.
   * 
   * @param {HTMLElement} container - Der Container, in den die Punkte eingefügt werden.
   * @param {Object} options - Konfigurationsobjekt mit den oben genannten Parametern.
   */
  function generatePointsForContainer(container, options) {
    const count = options.count || 250;             // Anzahl der Punkte (Standard: 250)
    const minSize = options.minSize || 2;             // Minimale Punktgröße (in Pixel)
    const maxSize = options.maxSize || 12;            // Maximale Punktgröße (in Pixel)
    const baseHue = options.baseHue || 200;           // Basis-Hue (Farbton) in HSL
    const baseS = options.baseS || 50;                // Basis-Sättigung in %
    const baseL = options.baseL || 50;                // Basis-Helligkeit in %
    const maxDiff = options.maxDiff || 8;             // Maximale Lichtabweichung (je höher, desto stärkere Variation)
    const exp = options.exponent || 2;                // Exponent für den Bias bei der Positionsberechnung
    const exclusivelyDarker = options.exclusivelyDarker || false; // Falls true: nur dunklere Werte als baseL

    for (let i = 0; i < count; i++) {
      const point = document.createElement("span");
      point.classList.add("point");

      // Bestimme eine zufällige Größe zwischen minSize und maxSize
      const size = Math.random() * (maxSize - minSize) + minSize;
      point.style.width = `${size}px`;
      point.style.height = `${size}px`;

      // Positioniere den Punkt innerhalb des Containers mit exponentiellem Bias
      const left = generateEdgeBiased(exp);
      const top = generateEdgeBiased(exp);
      point.style.left = `${left}%`;
      point.style.top = `${top}%`;

      // Berechne die Farbvariation: kleiner Punkt -> stärkere Variation, größerer Punkt -> weniger Variation.
      let variationFactor = ((maxSize - size) / (maxSize - minSize)) * maxDiff;
      
      let newL;
      if (exclusivelyDarker) {
        // Falls ausschließlich dunkler gewünscht: subtrahiere eine zufällige Variation vom Basis-Lichtwert.
        newL = baseL - Math.random() * variationFactor;
      } else {
        // Ansonsten: wähle zufällig Änderungsrichtung (heller oder dunkler)
        const sign = Math.random() < 0.5 ? -1 : 1;
        newL = baseL + sign * Math.random() * variationFactor;
      }
      // Stelle sicher, dass der neue Helligkeitswert im gültigen Bereich (0–100) liegt
      newL = Math.min(100, Math.max(0, newL));
      point.style.backgroundColor = `hsl(${baseHue}, ${baseS}%, ${newL}%)`;

      container.appendChild(point);
    }
  }

  // --- Punkte für die Drop-Zone generieren ---
  const dropZone = document.getElementById("drop-zone");
  let dzPointsContainer = dropZone.querySelector(".points-container");
  if (!dzPointsContainer) {
    dzPointsContainer = document.createElement("div");
    dzPointsContainer.classList.add("points-container");
    // Punkte-Container wird vor dem Content eingefügt, damit dieser oben bleibt
    dropZone.prepend(dzPointsContainer);
  }
  // Für die Drop-Zone:
  // Basisfarbe: #61A0AF, angenommene HSL-Werte ca. hue=192, saturation=29%, lightness=53%
  generatePointsForContainer(dzPointsContainer, {
    count: 400,                // Anzahl der Punkte in der Drop-Zone
    minSize: 2,                // Minimale Punktgröße in Pixel
    maxSize: 12,               // Maximale Punktgröße in Pixel
    baseHue: 192,              // Basis-Hue für die Drop-Zone
    baseS: 29,                 // Basis-Sättigung für die Drop-Zone
    baseL: 53,                 // Basis-Lichtheit für die Drop-Zone
    maxDiff: 15,                // Maximale Helligkeitsabweichung: hier erhöht, damit die Punkte besser sichtbar sind
    exponent: 2,               // Exponent für den Bias: je höher, desto mehr Punkte an den Rändern
    exclusivelyDarker: false   // In der Drop-Zone dürfen die Punkte heller oder dunkler sein
  });

  // --- Punkte für jeden Placeholder generieren ---
  const placeholders = document.querySelectorAll(".placeholder");
  placeholders.forEach((placeholder) => {
    let phPointsContainer = placeholder.querySelector(".points-container");
    if (!phPointsContainer) {
      phPointsContainer = document.createElement("div");
      phPointsContainer.classList.add("points-container");
      // Container wird als erstes Kind eingefügt, damit der Content darüber liegt
      placeholder.prepend(phPointsContainer);
    }
    // Für die Platzhalter:
    // Basisfarbe: #96C9DC, angenommene HSL-Werte ca. hue=196, saturation=50%, lightness=73%
    generatePointsForContainer(phPointsContainer, {
      count: 300,                // Anzahl der Punkte in einem Placeholder
      minSize: 2,                // Minimale Punktgröße in Pixel
      maxSize: 12,               // Maximale Punktgröße in Pixel
      baseHue: 196,              // Basis-Hue für die Platzhalter
      baseS: 50,                 // Basis-Sättigung für die Platzhalter
      baseL: 73,                 // Basis-Lichtheit für die Platzhalter
      maxDiff: 15,               // Maximale Helligkeitsabweichung: hier soll es exklusiv dunkler werden
      exponent: 2,               // Exponent für den Bias
      exclusivelyDarker: true    // Punkte in den Platzhaltern sollen ausschließlich dunkler als der Basiswert sein
    });
  });
});

