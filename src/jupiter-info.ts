import { ArrayBufferReader } from '@tubular/array-buffer-reader';
import { DateTime, tdtToUt } from '@tubular/time';
import { Angle, asin_deg, cos_deg, interpolateTabular, limitNeg1to1, sign, sin_deg, sqrt, squared, Unit } from '@tubular/math';
import { JD_J2000 } from './astro-constants';
import { IAstroDataService } from './i-astro-data.service';

export enum DataQuality { GOOD = 1, FAIR, POOR }

export class JupiterInfo {
  private static properlyInitialized: boolean = undefined;
  private static firstGRSDate: string;
  private static grsLongAtMinTime: number;
  private static grsLongAtMaxTime: number;
  private static grsLongAtMaxTimeAngle: Angle;
  private static interpolationSpan: number;
  private static lastGRSDate: string;
  private static maxGRSTableTime: number;
  private static minGRSTableTime: number;
  private static postTableGRSDrift: number; // degrees/day
  private static preTableGRSDrift: number;  // degrees/day
  private static grsTimes: number[] = [];
  private static grsLongs: number[] = [];

  static readonly DEFAULT_GRS_LONG = new Angle(-93.0, Unit.DEGREES);

  protected cacheTime = Number.MAX_VALUE;
  protected fixedGRSLong: Angle;
  protected grsCMOffset: Angle;
  protected grsLong = JupiterInfo.DEFAULT_GRS_LONG;
  protected sys1Long: Angle;
  protected sys2Long: Angle;

  private static readGrsInfo(grsData: ArrayBuffer): void {
    try {
      const reader = new ArrayBufferReader(grsData);

      this.preTableGRSDrift = Number(reader.readAnsiLine(true)) / 365.2425; // Convert degrees/year -> degrees/day
      this.postTableGRSDrift = Number(reader.readAnsiLine(true)) / 365.2425;
      this.interpolationSpan = Number(reader.readAnsiLine(true));
      this.grsTimes = [];
      this.grsLongs = [];

      let line;

      while ((line = reader.readAnsiLine(true)) !== null) {
        const parts = line.split(/[-,]/);

        if (parts.length === 4) {
          const Y = parts[0];
          const M = parts[1];
          const D = parts[2];
          const date = `${Y}-${M}-${D}`;
          const lon = Number(parts[3]);
          const year = Number(Y);
          const month = Number(M);
          const day = Number(D);
          const jd = DateTime.julianDay_SGC(year, month, day, 0, 0, 0);

          this.grsTimes.push(jd);
          this.grsLongs.push(lon);

          if (this.minGRSTableTime === undefined || this.minGRSTableTime > jd) {
            this.firstGRSDate = date;
            this.minGRSTableTime =  jd;
            this.grsLongAtMinTime = lon;
          }

          if (this.maxGRSTableTime === undefined || this.maxGRSTableTime < jd) {
            this.lastGRSDate = date;
            this.maxGRSTableTime =  jd;
            this.grsLongAtMaxTime = lon;
          }
        }
      }

      this.grsLongAtMaxTimeAngle = new Angle(this.grsLongAtMaxTime, Unit.DEGREES);
      this.properlyInitialized = true;
    }
    catch (error) {
      this.properlyInitialized = false;
    }
  }

  static getJupiterInfo(astroDataService: IAstroDataService): Promise<JupiterInfo> {
    if (this.properlyInitialized)
      return Promise.resolve(new JupiterInfo());
    else if (this.properlyInitialized === false)
      return Promise.reject(new Error('Failed to initialize JupiterInfo'));
    else {
      return astroDataService.getGrsData().then((grsData: ArrayBuffer) => {
        this.readGrsInfo(grsData);

        return this.getJupiterInfo(astroDataService);
      }).catch((reason: any) => {
        this.properlyInitialized = false;

        return Promise.reject(new Error('Failed to initialize JupiterInfo: ' + reason));
      });
    }
  }

  static grsDataQuality(time_JDU: number): DataQuality {
    if      (!this.properlyInitialized || time_JDU < this.minGRSTableTime - 730.0 || time_JDU > this.maxGRSTableTime + 730.0)
      return DataQuality.POOR;
    else if (time_JDU < this.minGRSTableTime - 365.0 || time_JDU > this.maxGRSTableTime + 365.0)
      return DataQuality.FAIR;
    else
      return DataQuality.GOOD;
  }

  static getFirstGRSDate(): string {
    return this.firstGRSDate;
  }

  static getLastGRSDate(): string {
    return this.lastGRSDate;
  }

  static getLastKnownGRSLongitude(): Angle {
    return this.grsLongAtMaxTimeAngle;
  }

  getSystemILongitude(time_JDE: number): Angle {
    if (this.cacheTime !== time_JDE) {
      this.calculateLongitudes(time_JDE);
      this.cacheTime = time_JDE;
    }

    return this.sys1Long;
  }

  getSystemIILongitude(time_JDE: number): Angle {
    if (this.cacheTime !== time_JDE) {
      this.calculateLongitudes(time_JDE);
      this.cacheTime = time_JDE;
    }

    return this.sys2Long;
  }

  getGRSLongitude(time_JDE: number): Angle {
    if (this.fixedGRSLong)
      return this.fixedGRSLong;
    else if (!JupiterInfo.properlyInitialized)
      return JupiterInfo.DEFAULT_GRS_LONG;
    else if (this.cacheTime !== time_JDE) {
      this.calculateLongitudes(time_JDE);
      this.cacheTime = time_JDE;
    }

    return this.grsLong;
  }

  getGRSCMOffset(time_JDE: number): Angle {
    if (this.cacheTime !== time_JDE) {
      this.calculateLongitudes(time_JDE);
      this.cacheTime = time_JDE;
    }

    return this.grsCMOffset;
  }

  setFixedGRSLongitude(longitude: number | Angle): void {
    if (typeof longitude === 'number')
      this.fixedGRSLong = new Angle(longitude as number, Unit.DEGREES);
    else
      this.fixedGRSLong = longitude as Angle;

    this.cacheTime = Number.MAX_VALUE;
  }

  getFixedGRSLongitude(): Angle {
    return this.fixedGRSLong;
  }

  getEffectiveFixedGRSLongitude(): Angle {
    if (this.fixedGRSLong)
      return this.fixedGRSLong;
    else if (JupiterInfo.properlyInitialized && JupiterInfo.minGRSTableTime === JupiterInfo.maxGRSTableTime &&
             JupiterInfo.preTableGRSDrift === 0.0 && JupiterInfo.postTableGRSDrift === 0.0)
      return new Angle(JupiterInfo.grsLongAtMinTime, Unit.DEGREES);
    else
      return JupiterInfo.DEFAULT_GRS_LONG;
  }

  clearFixedGRSLongitude(): void {
    this.fixedGRSLong = undefined;
    this.cacheTime = Number.MAX_VALUE;
  }

  protected calculateLongitudes(time_JDE: number): void {
    // This is an implementation of the low-accuracy calculation of Jupiter's
    // rotational values from _Astronomical Algorithms, 2nd Ed._ by Jean Meeus,
    // pp. 297-298.

    const d = time_JDE - JD_J2000;
    const V = 172.74  + 0.00111588 * d;
    const M = 357.529 + 0.9856003  * d;
    const N =  20.020 + 0.0830853  * d + 0.329 * sin_deg(V);
    const J =  66.115 + 0.9025179  * d - 0.329 * sin_deg(V);
    const A = 1.915 * sin_deg(M) + 0.020 * sin_deg(2.0 * M);
    const B = 5.555 * sin_deg(N) + 0.168 * sin_deg(2.0 * N);
    const K = J + A - B;
    const R = 1.00014 - 0.01671 * cos_deg(M) - 0.00014 * cos_deg(2.0 * M);
    const r = 5.20872 - 0.25208 * cos_deg(N) - 0.00611 * cos_deg(2.0 * N);
    const Δ = sqrt(r * r + R * R - 2.0 * r * R * cos_deg(K));
    const ψ = asin_deg(limitNeg1to1(R / Δ * sin_deg(K)));
    const ω1 = 210.98 + 877.8169088 * (d - Δ / 173) + ψ - B;
    const ω2 = 187.23 + 870.1869088 * (d - Δ / 173) + ψ - B;
    const cfp = 57.3 * squared(sin_deg(ψ / 2.0)) * sign(sin_deg(K));
    const cm1 = ω1 + cfp;
    const cm2 = ω2 + cfp;

    this.sys1Long = new Angle(cm1, Unit.DEGREES);
    this.sys2Long = new Angle(cm2, Unit.DEGREES);

    // And in addition to the above from Meeus...

    if (this.fixedGRSLong)
      this.grsLong = this.fixedGRSLong;
    else if (JupiterInfo.properlyInitialized) {
      let grs;
      const time_JDU = tdtToUt(time_JDE);

      if      (time_JDE < JupiterInfo.minGRSTableTime)
        grs = JupiterInfo.grsLongAtMinTime - (JupiterInfo.minGRSTableTime - time_JDU) * JupiterInfo.preTableGRSDrift;
      else if (time_JDE > JupiterInfo.maxGRSTableTime)
        grs = JupiterInfo.grsLongAtMaxTime + (time_JDU - JupiterInfo.maxGRSTableTime) * JupiterInfo.postTableGRSDrift;
      else
        grs = interpolateTabular(JupiterInfo.grsTimes, JupiterInfo.grsLongs, time_JDU, JupiterInfo.interpolationSpan);

      this.grsLong = new Angle(grs, Unit.DEGREES);
    }
    else
      this.grsLong = JupiterInfo.DEFAULT_GRS_LONG;

    this.grsCMOffset = this.sys2Long.subtract(this.grsLong);
  }
}
