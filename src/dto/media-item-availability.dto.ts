export class MediaItemAvailabilityDto {
  publicationId: string;
  available: string[] = [];
  missing: string[] = [];
}
