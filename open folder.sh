#!/usr/bin/env bash
# Deprecated name (space in filename). Use ./open-folder.sh instead.
exec "$(dirname "$0")/open-folder.sh" "$@"
cd ~/Projects/twin  && ./open-folder.sh "$@"
exit 0


    
