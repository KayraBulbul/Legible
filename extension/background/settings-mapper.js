/* Maps the extension's local a11ySettings shape to the backend's versioned accessibilitySettings
   contract (docs/api.md). The two schemas don't line up 1:1, so this is a deliberately lossy,
   documented downgrade rather than a generic key-for-key conversion. */

const BACKEND_DYSLEXIA_FONTS = new Set(['none', 'lexend', 'opendyslexic']);

// The backend's DyslexiaFont enum only models none/lexend/opendyslexic. The extension's other
// five font choices (atkinson, arial, verdana, opensans, comicsans) have no backend slot and
// fall back to "none" so a save never 422s on an unrecognized enum value.
function mapDyslexiaFont(font) {
  return BACKEND_DYSLEXIA_FONTS.has(font) ? font : 'none';
}

// The backend's ContrastMode enum only models none/dark/light. The extension's "invert" and
// "contrast" (high-contrast, which ships as a dark-background stylesheet) have no direct
// equivalent, so both collapse to "dark" as the closest visual analog.
function mapContrastMode(themeMode) {
  switch (themeMode) {
    case 'dark':
    case 'invert':
    case 'contrast':
      return 'dark';
    case 'light':
      return 'light';
    default:
      return 'none';
  }
}

function mapA11ySettingsToBackend(a11ySettings) {
  const s = a11ySettings || {};
  return {
    schemaVersion: 1,
    dyslexiaFont: mapDyslexiaFont(s.dyslexiaFont),
    contrastMode: mapContrastMode(s.themeMode),
    declutter: !!s.declutter,
    bionicReading: !!s.bionicReading,
    fontScale: Math.min(300, Math.max(50, Number(s.fontScale) || 100)),
    lineHeight: s.lineHeight || null,
    letterSpacing: s.letterSpacing ? Number(s.letterSpacing) : null,
    wordSpacing: null,
    // The extension has no dedicated "reduced motion" toggle; pausing animations is the
    // closest equivalent to the backend's reducedMotion flag.
    reducedMotion: !!s.pauseAnimations,
    readingWidth: null,
    ttsRate: Math.min(2, Math.max(0.5, Number(s.ttsRate) || 1)),
    ttsPitch: Math.min(2, Math.max(0, Number(s.ttsPitch) || 1)),
    voiceURI: s.voiceURI || null,
  };
}

export { mapA11ySettingsToBackend, mapDyslexiaFont, mapContrastMode };
