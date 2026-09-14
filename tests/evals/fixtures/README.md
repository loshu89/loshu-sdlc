# Eval Fixtures

This directory holds clean fixture repos used by the eval harness. In v0.1.1
the harness is **structural** (it compares `.story.md` to `.expected-*.md`),
so empty stage subdirectories are sufficient placeholders.

For v0.2.0, when the harness actually invokes the slash commands against a
fixture repo, this directory will hold one minimal scaffolded project per
stage (plan, design, build, test, deploy, maintain). Each fixture will be a
copy of `packages/templates/full/` rendered with `pnpm exec loshu-sdlc
create --template full --yes`, used as the working tree the eval runs against.

Until then, this file exists so the directory is preserved in version
control.
