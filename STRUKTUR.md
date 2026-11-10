# Projektstruktur

```
Portfolio/
├── index.html          Startseite
├── 404.html            Fehlerseite (mit Moka-Kanne)
├── vercel.json         Weiterleitungen alter Adressen (z. B. /contact.html)
├── arbeiten/           Seite «Arbeiten» (Projektraster, Filter, Lightbox, Reel-Feed)
├── ueber-mich/         Seite «Über mich»
├── kontakt/            Kontaktseite mit Formular (Formspree) und Danke-Popup
├── datenschutz/        Datenschutzerklärung
├── css/                style.css, das gesamte Design
├── js/                 main.js, alle Interaktionen (Navigation, Filter, Lightbox, Formular, Animationen)
├── assets/
│   ├── images/         Fotos als WebP, dazu Favicon und die zwei SVGs (Unterschrift, «Let's Talk»)
│   └── videos/         Hero-Video und Hover-Video «Simons Kaffee»
└── docs/screenshots/   Screenshots für die Dokumentation (nicht Teil der Website)
```

Jeder Seitenordner enthält nur eine `index.html`. So sind die Adressen sauber (`/kontakt/` statt `/kontakt.html`).
Reels und Reel-Vorschaubilder liegen bei Cloudinary und sind in `js/main.js` eingetragen.
