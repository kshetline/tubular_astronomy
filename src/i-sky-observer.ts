import { Angle, SphericalPosition, SphericalPosition3D } from '@tubular/math';

export interface ISkyObserver {
  readonly longitude: Angle;
  readonly latitude: Angle;
  getLocalHourAngle(time_JDU: number, apparent: boolean): Angle;
  getApparentSolarTime(time_JDU: number): Angle;
  equatorialTopocentricAdjustment(pos: SphericalPosition3D, time_JDE: number, flags: number): SphericalPosition3D;
  equatorialToHorizontal(pos: SphericalPosition, time_JDU: number, flags?: number): SphericalPosition;
  horizontalToEquatorial(pos: SphericalPosition, time_JDU: number, flags?: number): SphericalPosition;
}
