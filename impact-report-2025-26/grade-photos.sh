#!/usr/bin/env bash
# The report's shared photo grade ("warm film"): blacks lifted 3%, whites eased to 98%,
# saturation at 82%, a slight warm shift (red x1.025, blue x0.965) and a gentle S-curve.
# Every photo gets it except the two Convocation photos in the letter's hover peeks.
#
# Usage: ./grade-photos.sh <ungraded source> <output>   (quality: jpg 86, webp 88)
# Grade from the ungraded original, never from a file already in img/: the grade stacks.
# Ungraded originals for files graded on 2026-11-05 are in the commit before that change.
set -euo pipefail
in=$1 out=$2
q=86; [[ $out == *.webp ]] && q=88
convert "$in" -auto-orient +level 3%,98% -modulate 100,82 \
  -channel R -evaluate multiply 1.025 -channel B -evaluate multiply 0.965 +channel \
  -sigmoidal-contrast 1.5x50% -strip -quality "$q" "$out"
