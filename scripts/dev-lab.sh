#!/usr/bin/env bash
# dev-lab.sh — `next dev` contro il LABORATORIO, mai contro la produzione.
#
# Carica `.env.local` e poi `.env.lab.local` (che vince), come variabili
# d'ambiente: Next le legge sopra i suoi file .env. Il rifiuto e' la prima
# cosa che accade dopo il caricamento, prima che `next` parta.
set -euo pipefail
cd "$(dirname "$0")/.."
PRODUCTION_REF="cjsfocnhfzycbbgkwocx"
if [ ! -f .env.lab.local ]; then
  echo "RIFIUTO: .env.lab.local assente — non esiste un laboratorio da cui partire." >&2
  echo "         Ricetta: .planning/v1.6-LAB-DESIGN.md" >&2
  exit 2
fi
set -a; source .env.local; source .env.lab.local; set +a
case "${NEXT_PUBLIC_SUPABASE_URL:-}" in
  ""|*"$PRODUCTION_REF"*)
    echo "RIFIUTO: NEXT_PUBLIC_SUPABASE_URL e' la produzione o e' vuoto. Non parto." >&2
    exit 2;;
esac
echo "laboratorio ${LAB_PROJECT_REF:-?}  ·  app ${NEXT_PUBLIC_APP_URL:-?}"
exec npx next dev "$@"
