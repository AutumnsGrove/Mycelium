# Agent Handoff Prompts

These prompts are designed to be handed off to AI agents working on different Grove repositories. Each prompt contains full context for implementing a specific piece of the CLI-first architecture.

## Usage

Copy the contents of a prompt file and use it as the initial prompt when starting a new agent session in the target repository.

## Prompts

| File | Target Repo | Purpose |
|------|-------------|---------|
| `heartwood-device-code-auth.md` | GroveAuth | Add device code OAuth flow for CLI login |
| `amber-file-upload.md` | Amber | Add file upload endpoint |
| `lattice-api-expansion.md` | GroveEngine | Expand blog API with publish/media/tags |
| `mycelium-cli-init.md` | Mycelium | Initialize CLI framework locally |

## Dependency Order

```
1. Heartwood (device code auth)  ─┐
2. Amber (file upload)           ─┼─→ 4. Mycelium CLI init
3. Lattice (API expansion)       ─┘
```

Heartwood, Amber, and Lattice can be done in parallel. Mycelium CLI init can start in parallel but will need the others for full functionality.

## Reference

See `docs/PHASE1-CLI-REFACTOR-AUDIT.md` for the complete Phase 1 audit including:
- Full service catalog
- API audit details
- Architecture decisions
- Comprehensive TODO list
