#!/usr/bin/env bash
# Builds live.html: head + the shared 3D engine (public/AgentOffice3D.js) + body.
# Publish the output as a claude.ai Artifact with the `db` capability.
set -euo pipefail
cd "$(dirname "$0")"
{ cat head.html; echo '<script>'; cat ../public/AgentOffice3D.js; echo '</script>'; cat body.html; } > live.html
echo "built $(pwd)/live.html"
