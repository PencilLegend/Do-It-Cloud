// Dynamisches Hinzufügen der CSS-Datei mit Zeitstempel
const timestamp = new Date().getTime(); // Zeitstempel generieren
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = `styles.css?v=${timestamp}`; // CSS-Datei mit Versionierung
document.head.appendChild(linkElement); // In den <head>-Bereich einfügen

function updateMetrics() {
    const addressType = document.getElementById('addressType').value;
    const ipv4Metrics = document.getElementById('ipv4Metrics');
    const ipv6Metrics = document.getElementById('ipv6Metrics');

    if (addressType === 'ipv4') {
        ipv4Metrics.style.display = 'block';
        ipv6Metrics.style.display = 'none';
    } else if (addressType === 'ipv6') {
        ipv4Metrics.style.display = 'none';
        ipv6Metrics.style.display = 'block';
    }
}

function calculate() {
    const addressType = document.getElementById('addressType').value;
    const cidrInput = document.getElementById('cidrInput').value;

    if (!cidrInput.includes('/')) {
        alert("Bitte geben Sie eine gültige CIDR-Adresse ein.");
        return;
    }

    const [ipAddress, prefixLength] = cidrInput.split('/');
    const prefix = parseInt(prefixLength, 10);

    if (addressType === 'ipv4') {
        calculateIPv4(ipAddress, prefix);
    } else if (addressType === 'ipv6') {
        calculateIPv6(ipAddress, prefix);
    }
}

function calculateIPv4(ipAddress, prefix) {
    const ipParts = ipAddress.split('.').map(Number);
    if (ipParts.length !== 4 || ipParts.some(part => part < 0 || part > 255)) {
        alert("Ungültige IPv4-Adresse.");
        return;
    }

    const subnetMask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    const networkAddress = (ipToInt(ipParts) & subnetMask) >>> 0;
    const broadcastAddress = (networkAddress | ~subnetMask) >>> 0;
    const position = ipToInt(ipParts) - networkAddress + 1;

    document.getElementById('networkAddress').textContent = intToIp(networkAddress);
    document.getElementById('broadcastAddress').textContent = intToIp(broadcastAddress);
    document.getElementById('totalIPs').textContent = Math.pow(2, 32 - prefix);
    document.getElementById('usableHosts').textContent = Math.max(0, Math.pow(2, 32 - prefix) - 2);
    document.getElementById('addressPosition').textContent = position >= 1 && position <= Math.pow(2, 32 - prefix) ? `${position}. Adresse` : "Außerhalb des Netzwerks";
}

function calculateIPv6(ipAddress, prefix) {
    try {
        const expandedAddress = expandIPv6(ipAddress);
        const compressedAddress = compressIPv6(expandedAddress);
        const totalAddresses = BigInt(2) ** BigInt(128 - prefix);
        const subnetsPossible = BigInt(2) ** BigInt(prefix);
        const reverseDNS = generateReverseDNS(expandedAddress);

        document.getElementById('expandedAddress').textContent = expandedAddress;
        document.getElementById('compressedAddress').textContent = compressedAddress;
        document.getElementById('totalIPs').textContent = totalAddresses.toString();
        document.getElementById('subnetsPossible').textContent = subnetsPossible.toString();
        document.getElementById('reverseDNS').textContent = reverseDNS;
    } catch (error) {
        alert("Ungültige IPv6-Adresse.");
    }
}

function expandIPv6(ipAddress) {
    const parts = ipAddress.split('::');
    const left = parts[0].split(':');
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const zeros = Array(missing).fill('0000');
    return [...left, ...zeros, ...right].map(part => part.padStart(4, '0')).join(':');
}

function compressIPv6(expandedAddress) {
    return expandedAddress.replace(/(^|:)0+:0+/g, '::').replace(/(^|:)0+/g, ':');
}

function generateReverseDNS(expandedAddress) {
    const reversedHex = expandedAddress
        .replace(/:/g, '')
        .split('')
        .reverse()
        .join('.');
    return `${reversedHex}.ip6.arpa`;
}

function ipToInt(ipParts) {
    return ipParts.reduce((acc, part) => (acc << 8) | part, 0) >>> 0;
}

function intToIp(int) {
    return [(int >>> 24) & 0xFF, (int >>> 16) & 0xFF, (int >>> 8) & 0xFF, int & 0xFF].join('.');
}
