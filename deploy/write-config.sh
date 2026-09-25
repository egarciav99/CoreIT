#!/bin/sh
# Genera config.json a partir de variables de entorno del contenedor.
# Si no se define ninguna, se mantiene el config.json que venga en la imagen.
set -e
TARGET=/usr/share/nginx/html/config.json

if [ -z "${COREIT_MODE}${COREIT_COMPANY}${COREIT_LOGO_URL}${N8N_PDF_STEP1_URL}${N8N_PDF_STEP2_URL}" ]; then
  exit 0
fi

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cat > "$TARGET" <<JSON
{
  "mode": "$(json_escape "${COREIT_MODE:-client}")",
  "companyName": "$(json_escape "${COREIT_COMPANY:-}")",
  "logoUrl": "$(json_escape "${COREIT_LOGO_URL:-}")",
  "webhooks": {
    "pdfStep1": "$(json_escape "${N8N_PDF_STEP1_URL:-}")",
    "pdfStep2": "$(json_escape "${N8N_PDF_STEP2_URL:-}")"
  }
}
JSON
echo "CoreIT: config.json generado (modo ${COREIT_MODE:-client})"
