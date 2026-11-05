#!/usr/bin/env bash
# The report's shared photo grade ("warm film"): blacks lifted 3%, whites eased to 98%,
# saturation at 82%, a slight warm shift (red x1.025, blue x0.965) and a gentle S-curve.
# Every photo gets it except the two Convocation photos in the letter's hover peeks.
#
# A few photos need a correction first so they land with the rest (keyed on output name):
#   president-portrait: cream wall and red cardigan ran orange; cooled and desaturated.
#   alayna-erickson:    bright white room left her washed out; darker midtones, more contrast.
#
# Usage: ./grade-photos.sh <ungraded source> <output>   (quality: jpg 86, webp 88)
# Grade from the ungraded original, never from a file already in img/: the grade stacks.
# Ungraded originals for files graded on 2026-11-05 are in commit 67615b0.
set -euo pipefail
in=$1 out=$2
q=86; [[ $out == *.webp ]] && q=88
pre=()
case $(basename "$out") in
  president-portrait.*) pre=(-channel R -evaluate multiply 0.93 -channel B -evaluate multiply 1.07 +channel -modulate 96,80 -gamma 0.92) ;;
  alayna-erickson-*)    pre=(-gamma 0.82 -sigmoidal-contrast 4x45% -modulate 100,110) ;;
esac
convert "$in" -auto-orient "${pre[@]}" +level 3%,98% -modulate 100,82 \
  -channel R -evaluate multiply 1.025 -channel B -evaluate multiply 0.965 +channel \
  -sigmoidal-contrast 1.5x50% -strip -quality "$q" "$out"
