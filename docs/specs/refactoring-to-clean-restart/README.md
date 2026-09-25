## Current State

The production calculations currently implemented are the Go modules at
`GO/distance` and `GO/move`.

## Move Implementation

The clean-restart calculation is called `move` and is implemented in the Go
module `GO/move`, following the same CLI and reusable-library pattern as
`GO/distance`:

- Go calculation package with a simple exported function named `Move`.
- Compiled CLI invocation for direct use.
- JSON output by default, including the input arguments and result.
- `-L` flag for the legacy human-readable output.

The file `docs/specs/refactoring-to-clean-restart/move.py` is a reference
prototype for the calculation formula. It is not the production
implementation or the target runtime for this specification.
