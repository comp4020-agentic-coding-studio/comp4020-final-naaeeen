# Isolated table-fit spike

Mechanical source-only comparison, with no production imports replaced or edits.
Read [the frozen protocol](../../docs/spatial-redesign/evidence/table-fit-protocol-initial.md)
and [result/limitations](../../docs/spatial-redesign/evidence/table-fit-result.md).

Run from the canonical repository with the installed Node 24.21.0 binary:

```text
/home/lizhi/.local/share/mise/installs/node/24.21.0/bin/node prototypes/spatial-table-fit/runner.mjs initial 1.55 2.60 docs/spatial-redesign/evidence/table-fit-protocol-initial.md
```

JSON goes to stdout. SVG/HTML go to the evidence directory under the supplied label.
Exit 0 means calibration and named candidate mechanical gates passed; inspect the
separately reported global gameTarget diagnostic and all product limitations.
No user test, production integration or overall design acceptance is implied.
