# Transfer System Explorer

Interactive browser viewer for finite-group transfer systems.

This is a research-preview tool for browsing transfer systems, subgroup lattices
up to conjugacy, saturated/cosaturated classifications, draft transfer systems,
and selected compatibility data.

## Current Data

The app is static and data-driven. Group packages live under
`public/data/groups/`, and the app lazy-loads only the selected group.

Currently included:

- `A4`, SmallGroup(12,3): complete dataset
- `D9`, SmallGroup(18,1): complete dataset
- `D15`, SmallGroup(30,3): complete dataset, including disklike and maximal-compatible data
- `D21`, SmallGroup(42,5): complete dataset
- `D4`, `D6`, `D8`, `D10`, `D14`: saturated/cosaturated subset only
- `D12`: listed as pending; no public data file is enabled yet

## Run Locally

From this directory:

```bash
python3 -m http.server 4174
```

Then open:

```text
http://localhost:4174
```

## Data Status

Each group entry in `public/data/groups/manifest.json` has a `status`.

- `complete`: all transfer systems currently exported for the group
- `sat-cosat-only`: only the union of saturated and cosaturated transfer systems
- `pending`: visible in the UI but not selectable

Do not treat pending data as computed.

## Data Model

Each group package keeps:

- group metadata and provenance
- subgroup lattice nodes by conjugacy class
- full subgroup lattice edges
- class-edge projections with multiplicities
- transfer systems with full-edge and class-edge data
- saturated hull and cosaturated core data when exported
- maximal-compatible data when exported

The viewer displays mathematical classifications emitted by the exported data;
it does not redefine the mathematics in the browser.

## Citations and Acknowledgments

This project depends on the following mathematical and computational sources.
Please cite the original authors when using the data or ideas.

- Scott Balchin, `ninfty` code. Transfer systems and the saturated,
  cosaturated, and bisaturated classifications in this app are computed using
  Scott Balchin's `ninfty` implementation.
- GroupNames, maintained by David A. Craven.
  Subgroup lattice layouts and group metadata are taken from GroupNames pages,
  including their exported TeX subgroup lattices:
  <https://people.maths.bris.ac.uk/~matyd/GroupNames/>
- David DeMark, Michael A. Hill, Yigal Kamel, Nelson Niu, Kurt Stoeckl,
  Danika Van Niel, and Guoqi Yan,
  *Maximal compatibility of disklike G-transfer systems*,
  arXiv:2604.00335v1, 2026.
  The compatibility panel and maximal-compatible terminology are based on this
  paper.
- Blumberg--Hill and Chan's work on compatible pairs of transfer systems is used
  through the definitions and results cited in the paper above.

## Notes

This is not yet a polished database release. It is a public research preview
while the data-generation and validation pipeline is being strengthened.
