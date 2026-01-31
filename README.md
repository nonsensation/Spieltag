# Spieltag - Scoreboard Generator

Ein einfaches Tool um dynamische Spielstandsanzeigen für [saisonmanager.de](https://saisonmanager.de) Spiele zu erstellen.

Repository: [github.com/nonsensation/Spieltag](https://github.com/nonsensation/Spieltag)

## Funktionen

*   **Live Vorschau**: Sehen Sie sofort, wie das Scoreboard aussieht.
*   **Design Auswahl**: Wählen Sie aus verschiedenen vordefinierten Designs (Default, Retro, Modern, Neon, etc.).
*   **Anpassung**: Ändern Sie Teamnamen, Farben (Primär, Sekundär, Text) und Logos.
*   **Spiel laden**: Geben Sie eine Spiel-ID von saisonmanager.de ein, um automatisch Teamdaten und Logos zu laden.
*   **QR Code**: Generiert automatisch einen QR-Code für die erstellte Scoreboard-URL, ideal für OBS oder mobile Geräte.
*   **OBS Browser Source**: Die generierte URL kann direkt als Browser-Quelle in OBS Studio verwendet werden.

## Eigener Code (Custom Code)

Für maximale Flexibilität bietet der Generator einen **"Eigener Code"** (Custom Code) Modus.
Darin können Sie HTML und CSS komplett selbst schreiben.

### Verfügbare Variablen (IDs)
Das System füllt die Daten automatisch in HTML-Elemente mit den entsprechenden IDs:

*   `period`: Aktueller Spielabschnitt (z.B. 1. Drittel)
*   `time`: Spielzeit (falls verfügbar)
*   `img_home`: Logo Heimteam (`src` Attribut)
*   `name_home`: Name Heimteam
*   `score_home`: Tore Heimteam
*   `img_away`: Logo Gastteam (`src` Attribut)
*   `name_away`: Name Gastteam
*   `score_away`: Tore Gastteam

### CSS Variablen
Farben werden über CSS Variablen bereitgestellt:
*   `--home-primary`, `--home-secondary`, `--home-text`
*   `--guest-primary`, `--guest-secondary`, `--guest-text`

## Datenschutz & Technologie

Dieses Tool ist als statische Webseite konzipiert.
*   **Kein Tracking**: Es werden keine persönlichen Daten gesammelt.
*   **Lokale Speicherung**: Einstellungen und eigener Code werden ausschließlich im `LocalStorage` Ihres Browsers gespeichert.
*   **Externe Dienste**:
    *   Es werden Google Fonts geladen (Google APIs).
    *   Spieldaten werden von der offiziellen `saisonmanager.de` API geladen.
    *   QR Codes werden lokal via JavaScript generiert (siehe Credits).

## Credits

*   **QR Code Generator**: [qrcodejs](https://github.com/davidshimjs/qrcodejs) (MIT License)
*   **Remote Sync**: [PeerJS](https://peerjs.com/) (MIT License) - Ermöglicht direkte Browser-zu-Browser Verbindung.
*   **Schriften**: Google Fonts (Diverse Lizenzen)

## Remote Sync (Beta)

Der Generator bietet eine **Echtzeit-Synchronisierung** für Timer und Strafzeiten über das Internet (WebRTC via PeerJS).
Dies ermöglicht es, den Timer auf einem Laptop zu steuern, während das Scoreboard (z.B. auf einem Smartphone oder Tablet) an einem anderen Ort steht, auch ohne direkten Netzwerkzugriff (sofern beide Internet haben).

1. Aktiviere "Remote Sync" im Generator.
2. Scanne den QR-Code mit dem Zweitgerät.
3. Timer und Strafen werden sofort übertragen. (Punkte-Updates erfolgen weiterhin via API).

## Lokal Ausführen

Da dieses Projekt auf modernen Web-Features (wie ES6 Modulen und CORS) basiert, funktioniert es am besten über einen lokalen Webserver (nicht direkt via Doppelklick auf die Datei).

### Windows (mit Python)

Wenn Python installiert ist (Standard auf vielen Systemen):

1. Öffne die Eingabeaufforderung / Terminal.
2. Navigiere in den Projektordner:
   ```cmd
   cd C:\pfad\zu\Spieltag
   ```
3. Starte den Server:
   ```cmd
   py -m http.server
   ```
   *(oder `python -m http.server` je nach Version)*

4. Öffne im Browser: `http://localhost:8000`

### Node.js (Alternative)

Mit `http-server` Paket:

```bash
npx http-server .
```
