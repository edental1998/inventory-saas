# Hospitality imagery — sourcing & license

Generic (non-tenant-specific) food/hospitality photography used as a supporting
visual layer in the design system (auth side panel, branch card fallback
visuals). Not real photos of any Gestion customer's branch or products.

All images are from [Pexels](https://www.pexels.com), used under the
[Pexels License](https://www.pexels.com/license/): free for commercial and
noncommercial use, no attribution required, modification permitted. Credited
here anyway for traceability.

| File | Photographer | Source |
|---|---|---|
| `artisan-bread-basket.jpg` | Manish Jain | https://www.pexels.com/photo/artisanal-bread-basket-in-berlin-bakery-30926139/ |
| `golden-croissants.jpg` | Muhammad Fawdy | https://www.pexels.com/photo/close-of-photo-of-croissants-13425794/ |

Downloaded 2026-09-28 at 1600px width via the Pexels CDN (`images.pexels.com`).

## Reuse for other industries

These are the current (bakery/café-launch) fallback image set only. The
components that reference them import from
`src/lib/imagery/fallback-images.ts`, not hardcoded paths — swapping the
image set for a different industry vertical later means replacing the files
in this directory and updating that one config file, not touching any
component.
