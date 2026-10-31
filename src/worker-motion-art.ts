export const WORKER_FRAMES = {
  "down": {
    "idle": {
      "sheet": "workerMotionA",
      "crop": [
        132,
        21,
        194,
        236
      ],
      "anchorInCrop": [
        96.5,
        233
      ],
      "scale": 0.4782609
    },
    "punch": {
      "sheet": "workerMotionA",
      "crop": [
        1118,
        21,
        193,
        228
      ],
      "anchorInCrop": [
        96.5,
        232
      ],
      "scale": 0.4782609
    }
  },
  "down-right": {
    "idle": {
      "sheet": "workerMotionA",
      "crop": [
        130,
        280,
        196,
        237
      ],
      "anchorInCrop": [
        97.5,
        234
      ],
      "scale": 0.4761905
    },
    "punch": {
      "sheet": "workerMotionA",
      "crop": [
        1135,
        280,
        197,
        238
      ],
      "anchorInCrop": [
        97.5,
        233
      ],
      "scale": 0.4761905
    }
  },
  "right": {
    "idle": {
      "sheet": "workerMotionA",
      "crop": [
        121,
        533,
        203,
        243
      ],
      "anchorInCrop": [
        100,
        240
      ],
      "scale": 0.464135
    },
    "punch": {
      "sheet": "workerMotionA",
      "crop": [
        1125,
        536,
        222,
        243
      ],
      "anchorInCrop": [
        100.5,
        240
      ],
      "scale": 0.464135
    }
  },
  "up-right": {
    "idle": {
      "sheet": "workerMotionA",
      "crop": [
        122,
        789,
        209,
        253
      ],
      "anchorInCrop": [
        104,
        250
      ],
      "scale": 0.4453441
    },
    "punch": {
      "sheet": "workerMotionA",
      "crop": [
        1128,
        790,
        242,
        257
      ],
      "anchorInCrop": [
        105,
        251
      ],
      "scale": 0.4453441
    }
  },
  "up": {
    "idle": {
      "sheet": "workerMotionB",
      "crop": [
        110,
        30,
        203,
        244
      ],
      "anchorInCrop": [
        101.5,
        241
      ],
      "scale": 0.4621849
    },
    "punch": {
      "sheet": "workerMotionB",
      "crop": [
        1001,
        17,
        199,
        257
      ],
      "anchorInCrop": [
        98.5,
        262
      ],
      "scale": 0.4621849
    }
  },
  "up-left": {
    "idle": {
      "sheet": "workerMotionB",
      "crop": [
        104,
        307,
        203,
        262
      ],
      "anchorInCrop": [
        100.5,
        259
      ],
      "scale": 0.4296875
    },
    "punch": {
      "sheet": "workerMotionB",
      "crop": [
        989,
        307,
        236,
        260
      ],
      "anchorInCrop": [
        135.5,
        259
      ],
      "scale": 0.4296875
    }
  },
  "left": {
    "idle": {
      "sheet": "workerMotionB",
      "crop": [
        102,
        588,
        209,
        276
      ],
      "anchorInCrop": [
        104,
        273
      ],
      "scale": 0.4074074
    },
    "punch": {
      "sheet": "workerMotionB",
      "crop": [
        1006,
        588,
        236,
        272
      ],
      "anchorInCrop": [
        130.5,
        273
      ],
      "scale": 0.4074074
    }
  },
  "down-left": {
    "idle": {
      "sheet": "workerMotionB",
      "crop": [
        105,
        883,
        212,
        270
      ],
      "anchorInCrop": [
        105.5,
        267
      ],
      "scale": 0.4166667
    },
    "punch": {
      "sheet": "workerMotionB",
      "crop": [
        1019,
        882,
        220,
        269
      ],
      "anchorInCrop": [
        113,
        268
      ],
      "scale": 0.4166667
    }
  }
} as const;

// Provisional runtime split rig: visual QA required. Rectangular crops, not anatomical segmentation.
// Render boots first, then torso. Both boot anchorInCrop values register at same world origin.
// Screen-left/right names are deliberate, not anatomical left/right.
export const WORKER_BOOT_CUTS={down:[197,96,205],'down-right':[198,98,206],right:[203,100,211],'up-right':[212,104,220],up:[204,102,212],'up-left':[219,100,227],left:[231,104,239],'down-left':[226,106,234]} as const;
