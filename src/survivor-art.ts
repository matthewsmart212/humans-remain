import type {Direction} from './survival-engine';
import {RUNNER_CYCLE_SOURCES} from './runner-cycles';
export type SurvivorSprite={sheet:'survivorBase'|'survivorRear';crop:readonly [number,number,number,number];anchor:readonly [number,number];scale:number};
// Sprite component bounds and head-relative foot anchors: grid slices cut hair
// from neighbouring rows; per-frame resizing causes the body to pulse.
export const SURVIVOR_ART:Record<Direction,{idle:SurvivorSprite;walk:SurvivorSprite[];punch:SurvivorSprite}>={
  "down": {
    "idle": {
      "sheet": "survivorBase",
      "crop": [
        56,
        15,
        200,
        291
      ],
      "anchor": [
        99.0,
        286
      ],
      "scale": 0.39575972
    },
    "walk": [
      {
        "sheet": "survivorBase",
        "crop": [
          365,
          14,
          200,
          297
        ],
        "anchor": [
          99.0,
          286
        ],
        "scale": 0.39575972
      },
      {
        "sheet": "survivorBase",
        "crop": [
          674,
          21,
          197,
          291
        ],
        "anchor": [
          98.0,
          286
        ],
        "scale": 0.39575972
      }
    ],
    "punch": {
      "sheet": "survivorBase",
      "crop": [
        1000,
        16,
        196,
        287
      ],
      "anchor": [
        96.0,
        286
      ],
      "scale": 0.39575972
    }
  },
  "down-right": {
    "idle": {
      "sheet": "survivorBase",
      "crop": [
        59,
        320,
        203,
        292
      ],
      "anchor": [
        102.0,
        287
      ],
      "scale": 0.3943662
    },
    "walk": [
      {
        "sheet": "survivorBase",
        "crop": [
          367,
          318,
          206,
          296
        ],
        "anchor": [
          103.0,
          287
        ],
        "scale": 0.3943662
      },
      {
        "sheet": "survivorBase",
        "crop": [
          679,
          321,
          202,
          296
        ],
        "anchor": [
          100.0,
          287
        ],
        "scale": 0.3943662
      }
    ],
    "punch": {
      "sheet": "survivorBase",
      "crop": [
        1001,
        320,
        203,
        295
      ],
      "anchor": [
        100.0,
        287
      ],
      "scale": 0.3943662
    }
  },
  "right": {
    "idle": {
      "sheet": "survivorBase",
      "crop": [
        56,
        629,
        198,
        297
      ],
      "anchor": [
        100.0,
        292
      ],
      "scale": 0.38754325
    },
    "walk": [
      {
        "sheet": "survivorBase",
        "crop": [
          379,
          628,
          196,
          293
        ],
        "anchor": [
          100.0,
          293
        ],
        "scale": 0.38754325
      },
      {
        "sheet": "survivorBase",
        "crop": [
          678,
          627,
          209,
          295
        ],
        "anchor": [
          103.0,
          292
        ],
        "scale": 0.38754325
      }
    ],
    "punch": {
      "sheet": "survivorBase",
      "crop": [
        997,
        628,
        213,
        299
      ],
      "anchor": [
        98.0,
        292
      ],
      "scale": 0.38754325
    }
  },
  "up-right": {
    "idle": {
      "sheet": "survivorBase",
      "crop": [
        61,
        931,
        197,
        293
      ],
      "anchor": [
        100.0,
        288
      ],
      "scale": 0.39298246
    },
    "walk": [
      {
        "sheet": "survivorBase",
        "crop": [
          372,
          929,
          211,
          300
        ],
        "anchor": [
          100.0,
          288
        ],
        "scale": 0.39298246
      },
      {
        "sheet": "survivorBase",
        "crop": [
          683,
          930,
          194,
          297
        ],
        "anchor": [
          99.0,
          288
        ],
        "scale": 0.39298246
      }
    ],
    "punch": {
      "sheet": "survivorBase",
      "crop": [
        998,
        928,
        228,
        302
      ],
      "anchor": [
        105.0,
        288
      ],
      "scale": 0.39298246
    }
  },
  "up": {
    "idle": {
      "sheet": "survivorRear",
      "crop": [
        111,
        22,
        194,
        260
      ],
      "anchor": [
        98.0,
        255
      ],
      "scale": 0.44444444
    },
    "walk": [
      {
        "sheet": "survivorRear",
        "crop": [
          413,
          23,
          198,
          265
        ],
        "anchor": [
          99.0,
          255
        ],
        "scale": 0.44444444
      },
      {
        "sheet": "survivorRear",
        "crop": [
          717,
          19,
          196,
          272
        ],
        "anchor": [
          97.0,
          255
        ],
        "scale": 0.44444444
      }
    ],
    "punch": {
      "sheet": "survivorRear",
      "crop": [
        1009,
        18,
        202,
        264
      ],
      "anchor": [
        107.0,
        259
      ],
      "scale": 0.44444444
    }
  },
  "up-left": {
    "idle": {
      "sheet": "survivorRear",
      "crop": [
        103,
        306,
        201,
        265
      ],
      "anchor": [
        96.0,
        260
      ],
      "scale": 0.43579767
    },
    "walk": [
      {
        "sheet": "survivorRear",
        "crop": [
          415,
          304,
          194,
          273
        ],
        "anchor": [
          92.0,
          260
        ],
        "scale": 0.43579767
      },
      {
        "sheet": "survivorRear",
        "crop": [
          728,
          312,
          188,
          263
        ],
        "anchor": [
          91.0,
          260
        ],
        "scale": 0.43579767
      }
    ],
    "punch": {
      "sheet": "survivorRear",
      "crop": [
        995,
        304,
        228,
        268
      ],
      "anchor": [
        117.0,
        260
      ],
      "scale": 0.43579767
    }
  },
  "left": {
    "idle": {
      "sheet": "survivorRear",
      "crop": [
        93,
        590,
        205,
        280
      ],
      "anchor": [
        101.0,
        275
      ],
      "scale": 0.41176471
    },
    "walk": [
      {
        "sheet": "survivorRear",
        "crop": [
          411,
          589,
          207,
          278
        ],
        "anchor": [
          97.0,
          275
        ],
        "scale": 0.41176471
      },
      {
        "sheet": "survivorRear",
        "crop": [
          716,
          590,
          207,
          278
        ],
        "anchor": [
          99.0,
          275
        ],
        "scale": 0.41176471
      }
    ],
    "punch": {
      "sheet": "survivorRear",
      "crop": [
        1009,
        592,
        230,
        276
      ],
      "anchor": [
        119.0,
        275
      ],
      "scale": 0.41176471
    }
  },
  "down-left": {
    "idle": {
      "sheet": "survivorRear",
      "crop": [
        94,
        880,
        213,
        283
      ],
      "anchor": [
        103.0,
        278
      ],
      "scale": 0.40727273
    },
    "walk": [
      {
        "sheet": "survivorRear",
        "crop": [
          399,
          882,
          212,
          284
        ],
        "anchor": [
          105.0,
          278
        ],
        "scale": 0.40727273
      },
      {
        "sheet": "survivorRear",
        "crop": [
          712,
          884,
          214,
          282
        ],
        "anchor": [
          104.0,
          278
        ],
        "scale": 0.40727273
      }
    ],
    "punch": {
      "sheet": "survivorRear",
      "crop": [
        1018,
        887,
        228,
        276
      ],
      "anchor": [
        115.0,
        278
      ],
      "scale": 0.40727273
    }
  }
};
export const SURVIVOR_IMAGE_SOURCES={...RUNNER_CYCLE_SOURCES,"survivorBase": "/survival/scrap-runner/motion-a-v1.png", "survivorRear": "/survival/scrap-runner/motion-b-v1.png"};
