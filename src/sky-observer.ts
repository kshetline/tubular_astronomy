import {
  abs, Angle, asin, atan, atan2, cos, FMT_MINS, HALF_PI, interpolate, limitNeg1to1, mod, PI, sign, sin, SphericalPosition, SphericalPosition3D,
  sqrt, tan, to_degree, to_radian, TWO_PI, Unit
} from '@tubular/math';
import { tdtToUt, utToTdt } from '@tubular/time';
import { isNumber } from '@tubular/util';
import { ABERRATION, EARTH_RADIUS_KM, EARTH_RADIUS_POLAR_KM, KM_PER_AU, NUTATION, REFRACTION, SUN, TOPOCENTRIC } from './astro-constants';
import { refractedAltitude, unrefractedAltitude } from './astronomy-util';
import { ISkyObserver } from './i-sky-observer';
import { SolarSystem } from './solar-system';

const A90_1SEC = 1.5707915;
const A90_2SEC = 1.5707866;

SolarSystem.createSkyObserver = (longitude, latitude): SkyObserver => new SkyObserver(longitude, latitude);

export class SkyObserver implements ISkyObserver {
  private static solarSystem: SolarSystem;

  readonly _longitude: Angle;
  readonly _latitude: Angle;

  private elevation = 0;
  private ρ_sin_gcl: number;
  private ρ_cos_gcl: number;

  private cachedHourAngle: Angle = null;
  private cacheTimeHourAngle = 0;
  private cacheApparentHourAngle = false;

  private computeGeocentricValues(): void {
    const peRatio = EARTH_RADIUS_POLAR_KM / EARTH_RADIUS_KM;
    const latRad = this._latitude.radians;
    let u: number;

    // If within one arc-second of either pole, u is very close to the value of
    // the latitude anyway, so avoid having the tan function blow up at ±90°.
    // Between one and two arc-seconds from pole, interpolate to avoid a discontinuity.

    if (abs(latRad) > A90_1SEC)
      u = latRad;
    else if (abs(latRad) > A90_2SEC) {
      const s = sign(latRad);

      u = interpolate(s * A90_1SEC, latRad, s * A90_2SEC, latRad, atan(peRatio * tan(A90_2SEC)));
    }
    else
      u = atan(peRatio * this._latitude.tan);

    this.ρ_sin_gcl = peRatio * sin(u) + this.elevation / EARTH_RADIUS_KM / 1000 * this._latitude.sin;
    this.ρ_cos_gcl = cos(u) + this.elevation / EARTH_RADIUS_KM / 1000 * this._latitude.cos;
  }

  constructor(longitudeOrLatLong: number | SphericalPosition | Angle, latitude?: number | Angle) {
    if (!SkyObserver.solarSystem)
      SkyObserver.solarSystem = new SolarSystem();

    if (longitudeOrLatLong instanceof SphericalPosition) {
      this._longitude = longitudeOrLatLong.longitude;
      this._latitude = longitudeOrLatLong.latitude;
    }
    else {
      if (isNumber(longitudeOrLatLong))
        this._longitude = new Angle(longitudeOrLatLong, Unit.DEGREES);
      else
        this._longitude = longitudeOrLatLong;

      if (isNumber(latitude))
        this._latitude = new Angle(latitude, Unit.DEGREES);
      else
        this._latitude = latitude;
    }

    this.computeGeocentricValues();
  }

  get longitude(): Angle { return this._longitude; }

  get latitude(): Angle { return this._latitude; }

  getLocalHourAngle(time_JDU: number, apparent: boolean): Angle {
    if (this.cachedHourAngle === null || this.cacheTimeHourAngle !== time_JDU || this.cacheApparentHourAngle === apparent) {
      let gst: number;

      if (apparent)
        gst = SkyObserver.solarSystem.getGreenwichApparentSiderealTime(time_JDU);
      else
        gst = SolarSystem.getGreenwichMeanSiderealTime(time_JDU);

      this.cachedHourAngle = new Angle(gst, Unit.DEGREES).add_nonneg(this._longitude);
      this.cacheTimeHourAngle = time_JDU;
      this.cacheApparentHourAngle = apparent;
    }

    return this.cachedHourAngle;
  }

  getApparentSolarTime(time_JDU: number): Angle {
    const lha = this.getLocalHourAngle(time_JDU, true);
    const time_JDE = utToTdt(time_JDU);
    const sun =  SkyObserver.solarSystem.getEquatorialPosition(SUN, time_JDE, this).rightAscension;

    return lha.subtract(sun).add_nonneg(Angle.STRAIGHT);
  }

  // Note: Only right ascension and declination are modified -- distance is not modified
  // by the offset of the geographic location of the observer from the center of the
  // Earth. Distance is modified, however, in the function equatorialToHorizontalAux() in
  // order to improve the accuracy of computations such as the angular size of the Moon.
  //
  // Note: If diurnal aberration is computed for coordinates near the poles, there is a
  // slight discontinuity within one arcsecond of each pole.
  //
  equatorialTopocentricAdjustment(pos: SphericalPosition3D, time_JDE: number, flags: number): SphericalPosition3D {
    const time_JDU = tdtToUt(time_JDE);
    const lha      = this.getLocalHourAngle(time_JDU, (flags & NUTATION) !== 0).radians;
    const distance = pos.radius;
    // Sine of parallax, using 8.79412 arc seconds and distance in AU.
    const sinp = sin(8.79412 / 3600 / 180 * PI) / distance;
    let   RA   = pos.rightAscension.radians;
    const d    = pos.declination.radians;
    const H    = lha - RA;

    let ΔRA = atan2(-this.ρ_cos_gcl * sinp * sin(H),
                    cos(d) - this.ρ_cos_gcl * sinp * cos(H));
    let d1  = atan2((sin(d) - this.ρ_sin_gcl * sinp) * cos(ΔRA),
                    cos(d) - this.ρ_cos_gcl * sinp * cos(H));

    if ((flags & ABERRATION) !== 0) {
      RA += ΔRA;

      if (abs(d1) > HALF_PI - 4.85E-6) {
        ΔRA = 0;

        const rd = HALF_PI - abs(d1);
        const rl = 1.551E-6 * this._latitude.cos;
        const x  = cos(RA) * rd - sin(lha) * rl;
        const y  = sin(RA) * rd + cos(lha) * rl;
        const r  = sqrt(x ** 2 + y ** 2);

        RA = atan2(y, x);
        d1 = (HALF_PI - r) * sign(d1);
      }
      else {
        ΔRA = 1.551E-6 * this._latitude.cos * cos(H) / cos(d1);
        d1 += 1.551E-6 * this._latitude.cos * sin(d1) * sin(H);
      }
    }

    return new SphericalPosition3D(RA + ΔRA, d1, distance);
  }

  equatorialToHorizontal(pos: SphericalPosition, time_JDU: number, flags = 0): SphericalPosition {
    // Calculations are faster if nutation isn't calculated into the position of the planet,
    // because then nutation doesn't need to be figured into the hour angle either.
    const lha = this.getLocalHourAngle(time_JDU, (flags & NUTATION) !== 0).radians;
    const RA  = pos.rightAscension.radians;
    const d   = pos.declination.radians;
    const H   = lha - RA;

    const azimuth = atan2(sin(H),
                          (cos(H) * this._latitude.sin - tan(d) * this._latitude.cos));
    let altitude = asin(limitNeg1to1(this._latitude.sin * sin(d) + this._latitude.cos * cos(d) * cos(H)));
    const unrefracted = altitude;

    if ((flags & REFRACTION) !== 0)
      altitude = to_radian(refractedAltitude(to_degree(altitude)));

    if (pos instanceof SphericalPosition3D) {
      let distance = pos.radius;

      if ((flags & TOPOCENTRIC) !== 0) {
        const earthCtrDistance = EARTH_RADIUS_POLAR_KM +
                (EARTH_RADIUS_KM - EARTH_RADIUS_POLAR_KM) * this._latitude.cos + this.elevation / 1000;

        distance -= sin(unrefracted) * earthCtrDistance / KM_PER_AU;
      }

      return new SphericalPosition3D(azimuth, altitude, distance);
    }
    else
      return new SphericalPosition(azimuth, altitude);
  }

  horizontalToEquatorial(pos: SphericalPosition, time_JDU: number, flags = 0): SphericalPosition {
    const lha = this.getLocalHourAngle(time_JDU, (flags & NUTATION) !== 0).radians;
    let   altitude = pos.altitude.radians;
    const azimuth  = pos.azimuth.radians;

    if ((flags & REFRACTION) !== 0)
      altitude = to_radian(unrefractedAltitude(to_degree(altitude)));

    const RA = lha - atan2(sin(azimuth), cos(azimuth) * this._latitude.sin + tan(altitude) * this._latitude.cos);
    const declination = asin(limitNeg1to1(this._latitude.sin * sin(altitude) -
                                            this._latitude.cos * cos(altitude) * cos(azimuth)));

    return new SphericalPosition(mod(RA, TWO_PI), declination);
  }

  toString(): string {
    return `[${this._longitude.toString(FMT_MINS)}, ${this._latitude.toString(FMT_MINS)}, ${this.elevation}]`;
  }
}
