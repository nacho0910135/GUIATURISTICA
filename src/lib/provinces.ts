import rawProvinceData from '@/data/provinces.json';

export type ProvinceCoordinate = [longitude: number, latitude: number];

export type Province = {
  code: string;
  name: string;
  center: { latitude: number; longitude: number };
  bounds: {
    minLatitude: number;
    minLongitude: number;
    maxLatitude: number;
    maxLongitude: number;
  };
  polygons: ProvinceCoordinate[][];
};

type ProvinceData = {
  source: string;
  coordinateReferenceSystem: string;
  toleranceDegrees: number;
  provinces: Province[];
};

export const provinceData = rawProvinceData as ProvinceData;
export const provinces = provinceData.provinces;

export const provinceMarkerCoordinates: Record<string, ProvinceCoordinate> = {
  '1': [-84.05, 9.82],
  '2': [-84.72, 10.48],
  '3': [-83.7, 9.75],
  '4': [-84.02, 10.42],
  '5': [-85.25, 10.55],
  '6': [-83.9, 9.32],
  '7': [-83.28, 10.02],
};
