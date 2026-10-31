# Original historical asset limitations

Three historical PNG masters have truncated image data in the original Git blobs. They are preserved exactly as found, with hashes matching their source Git objects. They were not repaired or replaced. The current game does not load these archived historical copies.

| Export file | Original path | Original condition |
| --- | --- | --- |
| `historical-assets/0414c2e7b652/registered-master.png` | `artwork-archive/camp-return-v1/registered-master.png` | PNG header readable; full PNG verification reports truncated file data. |
| `historical-assets/5276ac7065ce/registered-master.png` | `artwork-archive/camp-return-v2/registered-master.png` | PNG header readable; full PNG verification reports truncated file data. |
| `historical-assets/f4be82f70168/registered-master.png` | `artwork-archive/village-outskirts-v1/registered-master.png` | PNG header readable; full PNG verification reports truncated file data. |

Other historical variants and current assets are retained separately; see `INVENTORY.csv` for their original paths. These truncated copies do not establish a complete image; any intact alternative should be checked against the separately retained variants or an independent original source.
