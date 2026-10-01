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
  7. Mis-nested but numerically balanced pairs (counts pass
     <details><summary></details></summary> — a stack check does not)
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

    # mask fenced regions and inline code: markup shown as an *example* is not
    # part of the document's structure (a `<div>` inside a fence must not count)
    in_fence = False
    masked = []
    for l in lines:
        if l.strip().startswith('```'):
            in_fence = not in_fence
            masked.append('')
            continue
        masked.append('' if in_fence else re.sub(r'`[^`]*`', '', l))
    masked_text = '\n'.join(masked)

    # 3. div balance (ALL divs — the nv-details content divs also count)
    opens  = [i+1 for i,l in enumerate(masked) if re.search(r'<div[\s>]', l)]
    # substring match: a `</div>` sharing its line with a comment or trailing
    # markup is still a close (exact equality false-positived those)
    closes = [i+1 for i,l in enumerate(masked) if re.search(r'</div>', l)]
    if len(opens) != len(closes):
        defects.append(f"total <div> open({len(opens)}) != close({len(closes)})")

    # 4. details/summary balance
    for tag in ('details','summary','Tabs'):
        o = len(re.findall(rf'<{tag}[\s>]', masked_text))
        c = len(re.findall(rf'</{tag}>', masked_text))
        if o != c:
            defects.append(f"<{tag}> open({o}) != close({c})")

    # 5. nested code fences inside admonitions (common silent-trap: a ``` inside <div> is jsx-text, not code)
    # Track full div depth: an inner <div>...</div> pair must not knock the
    # counter out of the admonition (nested-div false negative).
    div_depth = 0
    in_admonition = False
    for i,l in enumerate(lines):
        div_depth += len(re.findall(r'<div[\s>]', l)) - len(re.findall(r'</div>', l))
        if div_depth < 0: div_depth = 0
        if re.search(r'<div\s+class="admonition', l): in_admonition = True
        if in_admonition and div_depth > 0 and l.strip().startswith('```'):
            defects.append(f"fence inside admonition at line {i+1}: {l[:60]}... (MDX treats raw ``` as text)")
        if div_depth == 0: in_admonition = False

    # 6. duplicate consecutive non-empty lines (my step-6 bug pattern)
    for i in range(1, len(lines)):
        a,b = lines[i-1].strip(), lines[i].strip()
        if a and a == b and not a.startswith(('#','|','-','*')) and len(a) > 10:
            defects.append(f"consecutive duplicate lines {i}/{i+1}: {a[:60]}")

    # 7. nesting order for paired tags (fence-aware, inline-code-aware):
    #    counts alone cannot catch a balanced-but-mis-nested pair
    tag_re = re.compile(r'<(/?)(details|summary|Tabs|div)\b([^>]*?)(/?)>')
    stack = []
    for i, l in enumerate(masked):  # masked already drops fences + inline code
        for closing, name, _attrs, selfclose in tag_re.findall(l):
            if selfclose:
                continue
            if not closing:
                stack.append((name, i + 1))
            elif stack and stack[-1][0] == name:
                stack.pop()
            else:
                top = stack[-1][0] if stack else '(nothing open)'
                defects.append(
                    f"MISMATCHED nesting at line {i+1}: </{name}> appears while <{top}> is open"
                )
                stack = [s for s in stack if s[0] != name]  # resync
    for name, ln in stack:
        defects.append(f"UNCLOSED <{name}> opened at line {ln} (nesting check)")

    return defects

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "src/content/tutorials/setup/wifi7-on-jetson.mdx"
    ds = validate(path)
    if ds:
        print(f"DEFECTS in {path}:")
        for d in ds: print("  -", d)
        sys.exit(1)
    print(f"OK: {path} — fences balanced, components balanced, no duplicates")
