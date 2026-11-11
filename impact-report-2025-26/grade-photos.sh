#!/usr/bin/env bash
# The report's shared photo grade ("warm film"): blacks lifted 3%, whites eased to 98%,
# saturation at 82%, a slight warm shift (red x1.025, blue x0.965) and a gentle S-curve.
# Every photo gets it except the two Convocation photos in the letter's hover peeks.
#
# A few photos need a correction first so they land with the rest (keyed on output name):
#   president-portrait: cream wall and red cardigan ran orange; cooled, with added contrast.
#   alayna-erickson:    bright white room left her washed out; darker midtones, more contrast.
#   caleb-ratzlaff:     read darker than his sunlit interview film beside it; midtones lifted.
#
# Usage: ./grade-photos.sh <ungraded source> <output>   (quality: jpg 86, webp 88)
# Grade from the ungraded original, never from a file already in img/: the grade stacks.
# Ungraded originals for files graded on 2026-11-05 are in commit 67615b0.
set -euo pipefail
in=$1 out=$2
q=86; [[ $out == *.webp ]] && q=88
pre=()
case $(basename "$out") in
  president-portrait.*) pre=(-channel R -evaluate multiply 0.95 -channel B -evaluate multiply 1.05 +channel -modulate 100,95 -sigmoidal-contrast 2x50%) ;;
  alayna-erickson-*)    pre=(-gamma 0.88 -sigmoidal-contrast 2x45%) ;;
  caleb-ratzlaff.*)     pre=(-gamma 1.12) ;;
esac
convert "$in" -auto-orient "${pre[@]}" +level 3%,98% -modulate 100,82 \
  -channel R -evaluate multiply 1.025 -channel B -evaluate multiply 0.965 +channel \
  -sigmoidal-contrast 1.5x50% -strip -quality "$q" "$out"
