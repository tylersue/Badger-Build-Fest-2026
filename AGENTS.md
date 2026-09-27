<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## GSD command routing

- To edit an existing roadmap phase, invoke the Codex skill `$gsd-phase --edit <phase>` and follow its edit workflow. `gsd-tools.cjs phase edit` is not a CLI command.
- For roadmap reads, use `gsd-sdk query roadmap.get-phase <phase>` or `gsd-sdk query roadmap.analyze`. For requirement completion, use `gsd-sdk query requirements.mark-complete <IDs>`.
- `roadmap` and `requirements` are CLI command groups, not standalone operations. Check the installed `gsd-tools.cjs --help` or GSD's CLI reference before using a subcommand.
