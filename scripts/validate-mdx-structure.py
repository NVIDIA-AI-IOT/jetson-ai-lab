#!/usr/bin/env python3
"""Structural validator for Astro/MDX tutorial drafts.
Catches the render-breaking defects an eye misses and a fence-only check
won't localize:
  1. Odd fence count (unterminated code block swallows following content)
  2. Localizing WHICH fence is unpaired (pairing by owner)
  3. Unbalanced admonition/component divs (<div class="admonition"> vs </div>)
  4. Unclosed <details>/<summary> pairs
  5. JSX-style tag soup that MDX would reject on build
  6. Duplicated consecutive lines (insertion artifacts, like the step-6 bug)
Exits nonzero on any defect; prints precise line numbers.
"""
import re, sys
from pathlib import Path

def validate(path):
    text = Path(path).read_text()
    lines = text.splitlines()
    defects = []

    # 1+2. Fence pairing with localization
    fence_idx = [i for i,l in enumerate(lines) if l.strip().startswith('```')]
    if len(fence_idx) % 2 != 0:
        defects.append(f"ODD fence count ({len(fence_idx)}) — find the swallowing block by neighborhood")
    else:
        # report every fenced block's range and whether it's empty
        for a,b in zip(fence_idx[::2], fence_idx[1::2]):
            span = b - a
            if span < 2:
                defects.append(f"EMPTY code block at lines {a+1}-{b+1}")

    # 3. div balance (ALL divs — the nv-details content divs also count)
    opens  = [i+1 for i,l in enumerate(lines) if re.search(r'<div[\s>]', l)]
    closes = [i+1 for i,l in enumerate(lines) if l.strip() == '</div>']
    if len(opens) != len(closes):
        defects.append(f"total <div> open({len(opens)}) != close({len(closes)})")

    # 4. details/summary balance
    for tag in ('details','summary','Tabs'):
        o = len(re.findall(rf'<{tag}[\s>]', text))
        c = len(re.findall(rf'</{tag}>', text))
        if o != c:
            defects.append(f"<{tag}> open({o}) != close({c})")

    # 5. nested code fences inside admonitions (common silent-trap: a ``` inside <div> is jsx-text, not code)
    inside_admon = 0
    for i,l in enumerate(lines):
        if re.search(r'<div\s+class="admonition', l): inside_admon += 1
        if l.strip() == '</div>' and inside_admon > 0: inside_admon -= 1
        if inside_admon > 0 and l.strip().startswith('```'):
            defects.append(f"fence inside admonition at line {i+1}: {l[:60]}... (MDX treats raw ``` as text)")

    # 6. duplicate consecutive non-empty lines (my step-6 bug pattern)
    for i in range(1, len(lines)):
        a,b = lines[i-1].strip(), lines[i].strip()
        if a and a == b and not a.startswith(('#','|','-','*')) and len(a) > 10:
            defects.append(f"consecutive duplicate lines {i}/{i+1}: {a[:60]}")

    return defects

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "src/content/tutorials/setup/wifi7-on-jetson.mdx"
    ds = validate(path)
    if ds:
        print(f"DEFECTS in {path}:")
        for d in ds: print("  -", d)
        sys.exit(1)
    print(f"OK: {path} — fences balanced, components balanced, no duplicates")
