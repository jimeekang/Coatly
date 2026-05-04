import { INTERIOR_ESTIMATE_ANCHORS } from '@/config/interior-estimate-anchors';

export const DETAILED_ESTIMATE_INTERIOR_ROOM_KEYS = Object.keys(
  INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.rooms
) as Array<
  keyof typeof INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.rooms
>;

export type DetailedEstimateInteriorRoom =
  (typeof DETAILED_ESTIMATE_INTERIOR_ROOM_KEYS)[number];

export type DetailedEstimateAnchorRange = {
  min: number;
  median: number;
  max: number;
};

export type DetailedEstimateAnchors = {
  interior_rooms: Record<
    DetailedEstimateInteriorRoom,
    DetailedEstimateAnchorRange
  >;
};

export function buildDefaultDetailedEstimateAnchors(): DetailedEstimateAnchors {
  return {
    interior_rooms: Object.fromEntries(
      DETAILED_ESTIMATE_INTERIOR_ROOM_KEYS.map((room) => {
        const range =
          INTERIOR_ESTIMATE_ANCHORS.apartment.specific_areas.rooms[room];

        return [
          room,
          {
            min: Math.round(range.min * 100),
            median: Math.round(range.median * 100),
            max: Math.round(range.max * 100),
          },
        ];
      })
    ) as DetailedEstimateAnchors['interior_rooms'],
  };
}
