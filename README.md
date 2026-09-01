# Cove

A private-by-design read-it-later PWA for links, saved article text, highlights, notes, folders, tags, GitHub sync, and Daybook activity.

Production: https://jennie-verse.github.io/cove/

When Journal is enabled, the Reader records visible reading sessions with
start/end times and active minutes. Cove backup schema 3 includes this 90-day
session ledger while remaining compatible with schema 1 and 2 backups.

## Development

```sh
npm test
python3 -m http.server 4173
```

The GitHub Pages workflow deploys only the static runtime allowlist. Tests and package metadata remain in the source repository.
