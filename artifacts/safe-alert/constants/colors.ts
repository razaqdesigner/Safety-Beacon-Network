/**
 * SafeAlert design tokens.
 *
 * Brand palette:
 *   - Dominant indigo: #181463
 *   - Accent gold:     #B49757
 *   - Support mint:    #EBF5EE
 */

const colors = {
  light: {
    // Legacy aliases
    text: "#0A0833",
    tint: "#181463",

    // Core surfaces
    background: "#EBF5EE",
    foreground: "#0A0833",

    // Cards / elevated surfaces
    card: "#FFFFFF",
    cardForeground: "#0A0833",

    // Primary action color (the deep indigo)
    primary: "#181463",
    primaryForeground: "#FFFFFF",

    // Secondary surface
    secondary: "#DDE9E1",
    secondaryForeground: "#181463",

    // Muted (placeholders, dividers)
    muted: "#DDE9E1",
    mutedForeground: "#5C6173",

    // Accent (gold)
    accent: "#B49757",
    accentForeground: "#FFFFFF",

    // Destructive / emergency red used only for the SOS visual urgency
    destructive: "#D63B3B",
    destructiveForeground: "#FFFFFF",

    // Borders and input outlines
    border: "#CFDBD2",
    input: "#CFDBD2",
  },

  // Border radius (in px)
  radius: 16,
};

export default colors;
