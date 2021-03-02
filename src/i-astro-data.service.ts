import { AsteroidCometInfo } from './solar-system';

export interface IAstroDataService {
  getStars(): Promise<ArrayBuffer>;
  getGrsData(): Promise<ArrayBuffer>;
  getAsteroidData(): Promise<AsteroidCometInfo[]>;
  getCometData(): Promise<AsteroidCometInfo[]>;
}
