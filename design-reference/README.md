# Salama — UI Design Reference (extracted from Claude Design export)

This is the design source extracted from a Claude Design "standalone HTML" bundle,
with runtime libraries, embedded fonts, and base64 images removed. It contains
everything needed to redesign the UI and nothing that bloats the context.

## Contents
- `styles.css`     — the full design system: CSS custom properties (color tokens
                     for light/dark themes, radii, shadows, typography vars),
                     the "road lane" motif, animations, and component styles.
- `index.html`     — HTML skeleton showing document structure and where components mount.
- `components/`    — the UI source (JSX, React via Babel):
    - `01_STRINGS.jsx`     UI copy / string table
    - `02_MODES_I18N.jsx`  modes + Arabic/English i18n
    - `03_Icon.jsx`        icon set
    - `04_TokenMap.jsx`    token-level UQ visualization
    - `05_AuthScreen.jsx`  auth screen
    - `06_Sidebar.jsx`     sidebar / session list (main layout)

## Stripped (not design-relevant)
React + ReactDOM + Babel runtimes (~1.23 MB), 18 woff2 fonts (IBM Plex Sans
Arabic + Geist), and 3 PNGs. Font-family names are preserved in styles.css;
only the embedded binaries are gone.
