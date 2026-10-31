// src/lib/discoverTileShape.ts
// A Discover tile is drawn in the SAME shape the project's thumbnail was created in (see lib/thumbnailSpec.ts), at a
// rail width that suits that shape — so a row of audio cover art (square) doesn't look like a row of videos (16:9),
// and a talent banner (2:1) reads as a banner.
import { RAIL_TILE_WIDTH, THUMB_SPECS, thumbnailShapeOf, type ThumbnailCarrier } from "./thumbnailSpec";

export interface DiscoverTileShape {
  /** width / height — apply as inline style (`aspectRatio`), so it always matches the spec exactly. */
  ratio: number;
  /** Rail width; the "More" grids ignore this and fill their column. */
  width: string;
}

export function discoverTileShape(project: ThumbnailCarrier): DiscoverTileShape {
  const shape = thumbnailShapeOf(project);
  return { ratio: THUMB_SPECS[shape].ratio, width: RAIL_TILE_WIDTH[shape] };
}
