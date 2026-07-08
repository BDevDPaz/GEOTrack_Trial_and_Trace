#!/data/data/com.termux/files/usr/bin/bash
set -e

DEST="/storage/emulated/0/Documents/Termux"
mkdir -p "$DEST"

# Convertir reglas del .gitignore en parámetros -not -path para find
IGNORE_RULES=$(grep -v '^#' .gitignore | grep -v '^$' | while read -r rule; do
    # Normalizar rutas
    clean_rule="${rule#/}"          # quitar "/" inicial
    clean_rule="${clean_rule%/}"    # quitar "/" final

    # Ignorar archivos ocultos y carpetas ocultas automáticamente
    if [[ "$clean_rule" == .* ]]; then
        echo "-not -path \"*/$clean_rule/*\" -not -name \"$clean_rule\""
        continue
    fi

    # Si es carpeta
    if [[ -d "$clean_rule" ]]; then
        echo "-not -path \"*/$clean_rule/*\""
        continue
    fi

    # Si es archivo
    if [[ -f "$clean_rule" ]]; then
        echo "-not -name \"$clean_rule\""
        continue
    fi

    # Si es patrón (comodines)
    echo "-not -path \"*/$clean_rule\" -not -name \"$clean_rule\""
done)

# Añadir exclusión explícita de .git
IGNORE_RULES="$IGNORE_RULES -not -path \"*/.git/*\" -not -name \".git\""

# Ejecutar find con todas las reglas del .gitignore + .git
eval find . -type f $IGNORE_RULES | while read -r file; do
    dest_path="$DEST/${file}.txt"
    mkdir -p "$(dirname "$dest_path")"

    {
      echo "============================================================"
      echo "FILE: $file"
      echo "============================================================"
      cat "$file"
      echo
    } > "$dest_path"
done

echo
echo "Archivos exportados a:"
echo "$DEST"
echo

find "$DEST" -type f | sed 's|^| - |'
