---
provenance: loshu-sdlc owns
---

# Safety policy template

Customize per project. Default guidance:

## User safety

- Don't expose users to harmful content
- Provide clear warnings for risky actions
- Undo/redo for destructive operations

## Data safety

- Backups before destructive changes
- Soft delete by default; hard delete only on explicit request
- Audit trail for sensitive operations

## Operational safety

- Feature flags for risky changes
- Gradual rollouts (1% → 10% → 50% → 100%)
- Rollback plan before deploy
