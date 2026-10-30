// src/lib/discoverTileShape.ts
// Each kind of content on Discover gets its own tile shape (and a width that suits it), so a row of audio & video
// doesn't look like a row of groups. Discover only — a project's cover is still drawn at its natural shape elsewhere.
// Class names are written out in full so Tailwind can see them.
//
//   books    2:3  portrait   (the shape book covers are required to be, so nothing is cropped)
//   talents  3:4  portrait
//   events   4:5  poster
//   groups   1:1  square     (communities and cohorts)
//   pitches  5:4  
//   courses  4:3  landscape
//   meetings 3:2  landscape
//   audio & video 16:9 wide
//   links    2:1  banner
export interface DiscoverTileShape {
  aspect: string;
  /** Rail width; the "More" grids ignore this and fill their column. */
  width: string;
}

const SHAPES: Record<string, DiscoverTileShape> = {
  book: { aspect: "aspect-[2/3]", width: "w-[104px] sm:w-[120px]" },
  gig: { aspect: "aspect-[3/4]", width: "w-[112px] sm:w-[128px]" },
  event: { aspect: "aspect-[4/5]", width: "w-[120px] sm:w-[136px]" },
  room: { aspect: "aspect-square", width: "w-[120px] sm:w-[136px]" },
  pitch: { aspect: "aspect-[5/4]", width: "w-[136px] sm:w-[152px]" },
  course: { aspect: "aspect-[4/3]", width: "w-[152px] sm:w-[168px]" },
  meeting: { aspect: "aspect-[3/2]", width: "w-[148px] sm:w-[168px]" },
  media: { aspect: "aspect-video", width: "w-[176px] sm:w-[200px]" },
  url: { aspect: "aspect-[2/1]", width: "w-[152px] sm:w-[176px]" },
};

const DEFAULT_SHAPE: DiscoverTileShape = { aspect: "aspect-square", width: "w-[104px] sm:w-[120px]" };

export function discoverTileShape(projectType: string | null | undefined): DiscoverTileShape {
  return (projectType && SHAPES[projectType]) || DEFAULT_SHAPE;
}
