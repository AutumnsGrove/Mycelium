# Agent Handoff Prompts

These prompts are designed to be handed off to AI agents working on different Grove repositories. Each prompt contains full context for implementing a specific piece of the CLI-first architecture.

## Usage

Copy the contents of a prompt file and use it as the initial prompt when starting a new agent session in the target repository.

## Prompts & Status

| File | Target Repo | Purpose | Status |
|------|-------------|---------|--------|
| `heartwood-device-code-auth.md` | GroveAuth | Add device code OAuth flow for CLI login | ✅ **COMPLETE** (2026-01-19) |
| `amber-file-upload.md` | Amber | Add file upload endpoint | ⏳ Not started |
| `lattice-api-expansion.md` | GroveEngine | Expand blog API with publish/media/tags | ⏳ Not started |
| `mycelium-cli-init.md` | Mycelium | Initialize CLI framework locally | ✅ **COMPLETE** |
| `mycelium-phase2-resume.md` | Mycelium | Resume prompt for Phase 2 | 📝 Reference |

## Completion Notes

### heartwood-device-code-auth.md (COMPLETE)
- RFC 8628 device code endpoints implemented in GroveAuth
- `grove-cli` registered as OAuth client
- Session cookie fixes deployed (SameSite=Lax, grove_session validation)
- CLI-side flow implemented but command not wired up yet
- **Remaining**: Wire up `grove login` command, test E2E

### mycelium-cli-init.md (COMPLETE)
- CLI framework scaffolded with Commander.js
- Core service clients in `core/services/`
- Commands structure in `cli/commands/`
- Auth, config, and lattice commands implemented
- **Remaining**: Device code flow integration, additional commands

## Dependency Order

```
1. Heartwood (device code auth)  ─┐
2. Amber (file upload)           ─┼─→ 4. Mycelium CLI init
3. Lattice (API expansion)       ─┘
```

Heartwood, Amber, and Lattice can be done in parallel. Mycelium CLI init can start in parallel but will need the others for full functionality.

## Next Steps

1. **Amber file upload** - Run prompt in Amber repo to add upload endpoint
2. **Lattice API expansion** - Run prompt in GroveEngine to add publish/tags/media endpoints
3. **Wire up CLI** - Connect `grove login` command to device code flow

## Reference

See `docs/PHASE1-CLI-REFACTOR-AUDIT.md` for the complete Phase 1 audit including:
- Full service catalog
- API audit details
- Architecture decisions
- Comprehensive TODO list
