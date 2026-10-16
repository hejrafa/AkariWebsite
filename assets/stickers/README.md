# Fluent stickers

3D emoji from [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji), MIT licensed (LICENSE.txt),
at revision `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`, the one the app pins. Each source is the repository's
256 px 3D PNG, unchanged. `tools/bake_die_cuts.py` bakes the die-cut ladders into `<theme>/` here; the
admin dashboard keeps its own baked copies in `feedback-worker/public/assets/stickers/` (`pnpm bake` there).

| File | Source in fluentui-emoji | Shown on |
| --- | --- | --- |
| `bar-chart.png` | `assets/Bar chart/3D/bar_chart_3d.png` | Dashboard headline |
| `carrot.png` | `assets/Carrot/3D/carrot_3d.png` | Food inbox headline |
| `handshake.png` | `assets/Handshake/3D/handshake_3d.png` | Terms headline |
| `lock.png` | `assets/Locked/3D/locked_3d.png` | Privacy section, privacy headline |
| `sun-behind-cloud.png` | `assets/Sun behind cloud/3D/sun_behind_cloud_3d.png` | Readiness collage, as the app's Vitals hero shows it on a good day |

The goal and focus stickers (`goal-*.png`, `focus-*.png`) came from the same repository before this list was kept.
