/**
 * Humans Remain starting-screen icons, traced as code-native shapes from the
 * approved menu mockup. Each path uses a shared 48 × 48 coordinate system.
 *
 * Draw filled paths with the foreground colour and no stroke. Draw every other
 * path with no fill, the foreground colour as stroke, and round line caps/joins.
 * The paths use only M/L/C/Q/Z commands; SVG and Skia need no transforms within
 * the icon. The lock's body uses the normal non-zero winding rule for its hole.
 *
 * referenceSize is the enclosing UI square at a 1536 px reference width.
 * Scale this with the screen's existing reference-canvas scale.
 */

export type StartScreenIconName =
  | "play"
  | "friends"
  | "customise"
  | "upgrades"
  | "lock"
  | "settings";

export type StartScreenIconPath = {
  readonly d: string;
  readonly fill?: boolean;
  readonly strokeWidth?: number;
};

export type StartScreenIconDefinition = {
  readonly viewBox: "0 0 48 48";
  readonly referenceSize: number;
  readonly paths: readonly StartScreenIconPath[];
};

export const START_SCREEN_ICON_STROKE_WIDTH = 1.8;

export const START_SCREEN_ICONS = {
  play: {
    viewBox: "0 0 48 48",
    referenceSize: 28,
    paths: [
      { d: "M 5 3 L 45 24 L 5 45 Z", fill: true },
    ],
  },

  friends: {
    viewBox: "0 0 48 48",
    referenceSize: 45,
    paths: [
      // The central person is taller, with two smaller figures behind them.
      {
        d: "M 24 3 C 28.14 3 31.5 6.36 31.5 10.5 C 31.5 14.64 28.14 18 24 18 C 19.86 18 16.5 14.64 16.5 10.5 C 16.5 6.36 19.86 3 24 3 Z",
        fill: true,
      },
      {
        d: "M 9.5 11 C 12.54 11 15 13.46 15 16.5 C 15 19.54 12.54 22 9.5 22 C 6.46 22 4 19.54 4 16.5 C 4 13.46 6.46 11 9.5 11 Z M 38.5 11 C 41.54 11 44 13.46 44 16.5 C 44 19.54 41.54 22 38.5 22 C 35.46 22 33 19.54 33 16.5 C 33 13.46 35.46 11 38.5 11 Z",
        fill: true,
      },
      {
        d: "M 1.5 39 L 1.5 33 C 1.5 27.9 4.5 24.5 9.5 24.5 C 12.4 24.5 14.7 25.5 16.2 27.3 C 12.8 30.5 11.4 34.1 11.4 39 Z M 36.6 39 C 36.6 34.1 35.2 30.5 31.8 27.3 C 33.3 25.5 35.6 24.5 38.5 24.5 C 43.5 24.5 46.5 27.9 46.5 33 L 46.5 39 Z",
        fill: true,
      },
      {
        d: "M 14 43 L 14 33.5 C 14 26.7 17.9 21.8 24 21.8 C 30.1 21.8 34 26.7 34 33.5 L 34 43 Z",
        fill: true,
      },
    ],
  },

  customise: {
    viewBox: "0 0 48 48",
    referenceSize: 45,
    paths: [
      // Softly flared cuffs, rounded shoulders and two separate coat fronts.
      {
        d: "M 18 4.5 L 12.4 8 L 8.2 11.2 L 2.7 37.5 L 9.6 40.2 L 14.2 25 L 13.3 43.2 Q 17.5 45.4 22.3 44.4 L 24 26.7 L 25.7 44.4 Q 30.5 45.4 34.7 43.2 L 33.8 25 L 38.4 40.2 L 45.3 37.5 L 39.8 11.2 L 35.6 8 L 30 4.5 Q 24 7.2 18 4.5 Z",
        strokeWidth: 1.8,
      },
      // Folded collar, lapels and the shirt opening.
      {
        d: "M 18 4.5 L 15.4 11.7 L 19 13.4 L 17.7 17.7 L 24 26.7 L 30.3 17.7 L 29 13.4 L 32.6 11.7 L 30 4.5 M 20 5.5 L 24 15.6 L 28 5.5 M 24 15.6 L 24 26.7",
        strokeWidth: 1.7,
      },
      {
        d: "M 9.8 12.2 Q 13 18 14.2 25 M 38.2 12.2 Q 35 18 33.8 25 M 3.7 33.2 L 10.8 35.8 M 37.2 35.8 L 44.3 33.2",
        strokeWidth: 1.6,
      },
      // Patch pockets follow the slight outward drape of each coat front.
      {
        d: "M 16.4 29.5 L 21.1 30.3 L 20.6 35.7 L 15.9 35 Z M 26.9 30.3 L 31.6 29.5 L 32.1 35 L 27.4 35.7 Z",
        strokeWidth: 1.6,
      },
      {
        d: "M 24.8 30.1 C 25.24 30.1 25.6 30.46 25.6 30.9 C 25.6 31.34 25.24 31.7 24.8 31.7 C 24.36 31.7 24 31.34 24 30.9 C 24 30.46 24.36 30.1 24.8 30.1 Z M 24.4 36.5 C 24.84 36.5 25.2 36.86 25.2 37.3 C 25.2 37.74 24.84 38.1 24.4 38.1 C 23.96 38.1 23.6 37.74 23.6 37.3 C 23.6 36.86 23.96 36.5 24.4 36.5 Z",
        fill: true,
      },
    ],
  },

  upgrades: {
    viewBox: "0 0 48 48",
    referenceSize: 45,
    paths: [
      // The book's perspective and tilt are baked into its coordinates.
      {
        d: "M 15.6 4.2 L 41.7 7.2 Q 44 7.5 43.2 10 L 33.1 38.5 Q 32.5 40.6 30.1 40.3 L 5.5 37.5 Q 3.1 37.2 3.8 34.8 L 13.2 6.2 Q 13.8 4 15.6 4.2 Z",
        strokeWidth: 1.8,
      },
      {
        d: "M 4.1 34.9 Q 1.8 40.5 6 41.5 L 30.5 44.5 Q 33.3 44.8 34.3 42.1 L 44 14.1 M 7.1 39.5 L 30.3 42.3",
        strokeWidth: 1.6,
      },
      // Crossed hammer and pick; the tools are intentionally simple at 45 px.
      {
        d: "M 15.6 29.7 L 28.2 16.7 M 29.9 30.3 L 17.9 17.6",
        strokeWidth: 1.9,
      },
      {
        d: "M 25 13.6 L 29 9.9 L 35.1 15.5 L 31.1 19.3 Z M 12.6 17.5 Q 18.3 10.2 25 14.1 L 22.4 16.3 Q 18.8 14.6 15.4 20.1 Z",
        strokeWidth: 1.7,
      },
    ],
  },

  lock: {
    viewBox: "0 0 48 48",
    referenceSize: 14,
    paths: [
      {
        d: "M 13 20 L 13 14 C 13 7.9 17.9 3 24 3 C 30.1 3 35 7.9 35 14 L 35 20 L 29 20 L 29 14 C 29 11.2 26.8 9 24 9 C 21.2 9 19 11.2 19 14 L 19 20 Z",
        fill: true,
      },
      {
        d: "M 11 20 L 37 20 Q 40 20 40 23 L 40 42 Q 40 45 37 45 L 11 45 Q 8 45 8 42 L 8 23 Q 8 20 11 20 Z M 24 26 C 20.7 26 19 28 19 30 C 19 32 20 33 21.5 34 L 21 39 L 27 39 L 26.5 34 C 28 33 29 32 29 30 C 29 28 27.3 26 24 26 Z",
        fill: true,
      },
    ],
  },

  settings: {
    viewBox: "0 0 48 48",
    referenceSize: 35,
    paths: [
      {
        d: "M 18.68 7.64 L 21.01 7.06 L 20.94 2.21 L 27.06 2.21 L 26.99 7.06 L 29.32 7.64 L 31.54 8.54 L 34.33 4.58 L 39.28 8.17 L 36.37 12.05 L 37.92 13.89 L 39.19 15.93 L 43.77 14.36 L 45.67 20.18 L 41.03 21.61 L 41.2 24 L 41.03 26.39 L 45.67 27.82 L 43.77 33.64 L 39.19 32.07 L 37.92 34.11 L 36.37 35.95 L 39.28 39.83 L 34.33 43.42 L 31.54 39.46 L 29.32 40.36 L 26.99 40.94 L 27.06 45.79 L 20.94 45.79 L 21.01 40.94 L 18.68 40.36 L 16.46 39.46 L 13.67 43.42 L 8.72 39.83 L 11.63 35.95 L 10.08 34.11 L 8.81 32.07 L 4.23 33.64 L 2.33 27.82 L 6.97 26.39 L 6.8 24 L 6.97 21.61 L 2.33 20.18 L 4.23 14.36 L 8.81 15.93 L 10.08 13.89 L 11.63 12.05 L 8.72 8.17 L 13.67 4.58 L 16.46 8.54 Z",
        strokeWidth: 1.9,
      },
      {
        d: "M 31 24 C 31 27.87 27.87 31 24 31 C 20.13 31 17 27.87 17 24 C 17 20.13 20.13 17 24 17 C 27.87 17 31 20.13 31 24 Z",
        strokeWidth: 1.9,
      },
    ],
  },
} as const satisfies Record<StartScreenIconName, StartScreenIconDefinition>;
