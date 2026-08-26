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
