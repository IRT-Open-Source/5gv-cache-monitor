export class CacheStateUpdateDto {
  base: string;
  mediaItems: { all: string; one: string };
  streams: {
    all: string;
    one: string;
    missing: {
      all: string;
      mediaItem: string;
    };
    available: {
      all: string;
      mediaItem: string;
    };
  };
}
