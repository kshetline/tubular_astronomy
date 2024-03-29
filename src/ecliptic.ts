/*
  This is an implementation of the method of computing nutation presented
  by Jean Meeus in _Astronomical Algorithms, 2nd Ed._
*/

import {
  abs, Angle, asin, atan2, cos, cos_deg, HALF_PI, limitNeg1to1, PI, sin, sin_deg, SphericalPosition, SphericalPosition3D,
  sqrt, Unit
} from '@tubular/math';
import { isNumber } from '@tubular/util';
import { JD_J2000, OBLIQUITY_J2000 } from './astro-constants';

export interface Nutation {
  Δψ: Angle;
  Δε: Angle;
  ε: Angle;
}

export enum NMode { NUTATED,        // Return nutation in longitude, and nutation-adjusted true obliquity.
                    MEAN_OBLIQUITY, // Return no nutation, only non-nutated mean obliquity.
                    J2000,          // Return no nutation, simply fixed obliquity of the J2000.0 ecliptic.
                    ANTI_NUTATED }  // Remove nutation from an already-nutated set of coordinates.

interface NutationTerm {
  fD: number;
  fM: number;
  fM1: number;
  fF: number;
  fQ: number;
  cs0: number;
  cs1: number;
  cc0: number;
  cc1: number;
}

// From _Astronomical Algorithms, 2nd Ed._ by Jean Meeus
// p. 147.
const coeffs = [-4680.93, -1.55, 1999.25, -51.38, -249.67, -39.05, 7.12, 27.87, 5.79, 2.45];

// From _Astronomical Algorithms, 2nd Ed._ by Jean Meeus
// pp. 145-146, Table 22.A
const table = [
  '0 0 0 0 1 -171996 -174.2T 92025 8.9T',
  '-2 0 0 2 2 -13187 -1.6T 5736 -3.1T',
  '0 0 0 2 2 -2274 -0.2T 977 -0.5T',
  '0 0 0 0 2 2062 0.2T -895 0.5T',
  '0 1 0 0 0 1426 -3.4T 54 -0.1T',
  '0 0 1 0 0 712 0.1T -7',
  '-2 1 0 2 2 -517 1.2T 224 -0.6T',
  '0 0 0 2 1 -386 -0.4T 200',
  '0 0 1 2 2 -301 129 -0.1T',
  '-2 -1 0 2 2 217 -0.5T -95 0.3T',
  '-2 0 1 0 0 -158',
  '-2 0 0 2 1 129 0.1T -70',
  '0 0 -1 2 2 123 -53',
  '2 0 0 0 0 63',
  '0 0 1 0 1 63 0.1T -33',
  '2 0 -1 2 2 -59 26',
  '0 0 -1 0 1 -58 -0.1T 32',
  '0 0 1 2 1 -51 27',
  '-2 0 2 0 0 48',
  '0 0 -2 2 1 46 -24',
  '2 0 0 2 2 -38 16',
  '0 0 2 2 2 -31 13',
  '0 0 2 0 0 29',
  '-2 0 1 2 2 29 -12',
  '0 0 0 2 0 26',
  '-2 0 0 2 0 -22',
  '0 0 -1 2 1 21 -10',
  '0 2 0 0 0 17 -0.1T',
  '2 0 -1 0 1 16 -8',
  '-2 2 0 2 2 -16 0.1T 7',
  '0 1 0 0 1 -15 9',
  '-2 0 1 0 1 -13 7',
  '0 -1 0 0 1 -12 6',
  '0 0 2 -2 0 11',
  '2 0 -1 2 1 -10 5',
  '2 0 1 2 2 -8 3',
  '0 1 0 2 2 7 -3',
  '-2 1 1 0 0 -7',
  '0 -1 0 2 2 -7 3',
  '2 0 0 2 1 -7 3',
  '2 0 1 0 0 6',
  '-2 0 2 2 2 6 -3',
  '-2 0 1 2 1 6 -3',
  '2 0 -2 0 1 -6 3',
  '2 0 0 0 1 -6 3',
  '0 -1 1 0 0 5',
  '-2 -1 0 2 1 -5 3',
  '-2 0 0 0 1 -5 3',
  '0 0 2 2 1 -5 3',
  '-2 0 2 0 1 4',
  '-2 1 0 2 1 4',
  '0 0 1 -2 0 4',
  '-1 0 1 0 0 -4',
  '-2 1 0 0 0 -4',
  '1 0 0 0 0 -4',
  '0 0 1 2 0 3',
  '0 0 -2 2 2 -3',
  '-1 -1 1 0 0 -3',
  '0 1 1 0 0 -3',
  '0 -1 1 2 2 -3',
  '2 -1 -1 2 2 -3',
  '0 0 3 2 2 -3',
  '2 -1 0 2 2 -3'];

let terms: NutationTerm[];

(function (): void {
  terms = table.map((line): NutationTerm => {
    const fields = line.split(' ');
    const value = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let index = 0;
    let hasT: boolean;

    for (let field of fields) {
      if (field.endsWith('T')) {
        hasT = true;
        field = field.substring(0, field.length - 1);
      }
      else
        hasT = false;

      if (index === 6 && !hasT)
        ++index;

      value[index] = Number(field);
      ++index;
    }

    return {
      fD:  value[0],
      fM : value[1],
      fM1: value[2],
      fF:  value[3],
      fQ:  value[4],
      cs0: value[5],
      cs1: value[6],
      cc0: value[7],
      cc1: value[8]
    };
  });
})();

export class Ecliptic {
  private cachedTime = 0;
  private cachedMode = NMode.NUTATED;
  private cachedNutation: Nutation = null;

  static precessEquatorial(pos: SphericalPosition, initialOrFinalEpoch: number,
                           finalEpoch?: number): SphericalPosition {
    let initialEpoch;

    if (isNumber(finalEpoch))
      initialEpoch = initialOrFinalEpoch;
    else {
      initialEpoch = JD_J2000;
      finalEpoch = initialOrFinalEpoch;
    }

    const T = (initialEpoch - JD_J2000) / 36525;
    const T2 = T ** 2;
    const t = (finalEpoch - initialEpoch) / 36525;
    const t2 = t ** 2;
    const t3 = t2 * t;
    const RA0 = pos.rightAscension.radians;
    const dec0 = pos.declination.radians;

    let ζ = (2306.2181 + 1.39656 * T - 0.000139 * T2) * t
            + (0.30188 - 0.000344 * T) * t2 + 0.017998 * t3;
    let z   = (2306.2181 + 1.39656 * T - 0.000139 * T2) * t
            + (1.09468 + 0.000066 * T) * t2 + 0.018203 * t3;
    let θ = (2004.3109 - 0.85330 * T - 0.000217 * T2) * t
            - (0.42665 + 0.000217 * T) * t2 - 0.041833 * t3;

    // For convenience, convert the above arcsecond values to radians.
    ζ *= PI / 648000;
    z *= PI / 648000;
    θ *= PI / 648000;

    const A = cos(dec0) * sin(RA0 + ζ);
    const B = cos(θ) * cos(dec0) * cos(RA0 + ζ) - sin(θ) * sin(dec0);
    const C = sin(θ) * cos(dec0) * cos(RA0 + ζ) + cos(θ) * sin(dec0);
    const RA = atan2(A, B) + z;
    let dec;

    // We'll use a different calculation for positions within 1 arcsecond
    // of either celestial pole.
    if (HALF_PI - abs(dec0) > 4.85E-6)
      dec = asin(C);
    else
      dec = sqrt(A ** 2 + B ** 2);

    return new SphericalPosition(RA, dec);
  }

  static precessEquatorial3D(pos: SphericalPosition3D, initialOrFinalEpoch: number,
                             finalEpoch?: number): SphericalPosition3D {
    const pos2 = Ecliptic.precessEquatorial(pos, initialOrFinalEpoch, finalEpoch);

    return new SphericalPosition3D(pos2.longitude, pos2.latitude, pos.radius);
  }

  static precessEcliptical(pos: SphericalPosition, initialOrFinalEpoch: number,
                           finalEpoch?: number): SphericalPosition {
    let initialEpoch;

    if (isNumber(finalEpoch))
      initialEpoch = initialOrFinalEpoch;
    else {
      initialEpoch = JD_J2000;
      finalEpoch = initialOrFinalEpoch;
    }

    const T = (initialEpoch - JD_J2000) / 36525;
    const T2 = T ** 2;
    const t = (finalEpoch - initialEpoch) / 36525;
    const t2 = t ** 2;
    const t3 = t2 * t;
    const L0 = pos.longitude.radians;
    const B0 = pos.latitude.radians;

    let η  = (47.0029 - 0.06603 * T + 0.000598 * T2) * t
           + (-0.03302 + 0.000598 * T) * t2 + 0.000060 * t3;
    let P1 = (174.876384 * 3600) + 3289.4789 * T + 0.60622 * T2
           - (869.8089 + 0.50491 * T) * t + 0.03536 * t2;
    let p  = (5029.0966 + 2.22226 * T - 0.000042 * T2) * t
           + (1.11113 - 0.000042 * T) * t2 - 0.000006 * t3;

    // For convenience, convert the above arcsecond values to radians.
    η  *= PI / 648000;
    P1 *= PI / 648000;
    p  *= PI / 648000;

    const A1 = cos(η) * cos(B0) * sin(P1 - L0) - sin(η) * sin(B0);
    const B1 = cos(B0) * cos(P1 - L0);
    const C1 = cos(η) * sin(B0) + sin(η) * cos(B0) * sin(P1 - L0);

    const L = p + P1 - atan2(A1, B1);
    const B = asin(limitNeg1to1(C1));

    return new SphericalPosition(L, B);
  }

  static precessEcliptical3D(pos: SphericalPosition3D, initialOrFinalEpoch: number,
                             finalEpoch?: number): SphericalPosition3D {
    const pos2 = Ecliptic.precessEcliptical(pos, initialOrFinalEpoch, finalEpoch);

    return new SphericalPosition3D(pos2.longitude, pos2.latitude, pos.radius);
  }

  getNutation(time_JDE: number, mode: NMode = NMode.NUTATED): Nutation {
    if (this.cachedTime === time_JDE && this.cachedMode === mode)
      return this.cachedNutation;

    const T = (time_JDE - JD_J2000) / 36525;
    const result = {} as Nutation;

    if (mode === NMode.J2000) {
      result.Δψ = new Angle(0);
      result.Δε = new Angle(0);
      result.ε = new Angle(OBLIQUITY_J2000, Unit.DEGREES);
    }
    else {
      let U = T / 100;
      let e = OBLIQUITY_J2000;

      for (const coeff of coeffs) {
        e += coeff * U / 3600;
        U *= U;
      }

      result.ε = new Angle(e, Unit.DEGREES);

      if (mode === NMode.MEAN_OBLIQUITY) {
        result.Δψ = new Angle(0);
        result.Δε = new Angle(0);
      }
      else {
        const T2 = T ** 2;
        const T3 = T2 * T;

        // Mean elongation of Moon from Sun
        const D = 297.85036 + 445267.111480 * T - 0.0019142 * T2 + T3 / 189474;
        // Mean anomaly of Sun
        const M = 357.52772 + 35999.050340 * T - 0.0001603 * T2 - T3 / 300000;
        // Mean anomaly of Moon
        const M1 = 134.96298 + 477198.867398 * T + 0.0086972 * T2 + T3 / 56250;
        // Moon's argument of latitude
        const F = 93.27191 + 483202.017538 * T + 0.0036825 * T2 + T3 / 327270;
        // Longitude of ascending node of Moon's mean orbit
        const Q = 125.04452 - 1934.136261 * T + 0.0020708 * T2 + T3 / 450000;

        let arg;
        let Δψ = 0;
        let Δε = 0;

        for (const term of terms) {
          arg = D * term.fD + M * term.fM + M1 * term.fM1 + F * term.fF + Q * term.fQ;
          Δψ += sin_deg(arg) * (term.cs0 + term.cs1 * T);
          Δε += cos_deg(arg) * (term.cc0 + term.cc1 * T);
        }

        result.Δψ = new Angle(Δψ / 10000, Unit.ARC_SECONDS);
        result.Δε = new Angle(Δε / 10000, Unit.ARC_SECONDS);
        result.ε = result.ε.add(result.Δε);
      }
    }

    this.cachedTime = time_JDE;
    this.cachedMode = mode;
    this.cachedNutation = result;

    return this.cachedNutation;
  }

  nutateEclipticPosition(pos: SphericalPosition, time_JDE: number, mode = NMode.NUTATED): SphericalPosition {
    if (mode === NMode.J2000)
      return pos;

    let nutation = this.getNutation(time_JDE, mode === NMode.ANTI_NUTATED ? NMode.NUTATED : mode).Δψ;

    if (mode === NMode.ANTI_NUTATED)
      nutation = nutation.negate();

    return new SphericalPosition(pos.longitude.add_nonneg(nutation), pos.latitude);
  }

  nutateEclipticPosition3D(pos: SphericalPosition3D, time_JDE: number, mode = NMode.NUTATED): SphericalPosition3D {
    if (mode === NMode.J2000)
      return pos;

    return SphericalPosition3D.from2D(this.nutateEclipticPosition(pos, time_JDE, mode), pos.radius);
  }

  nutateEquatorialPosition(pos: SphericalPosition, time_JDE: number, mode = NMode.NUTATED): SphericalPosition {
    if (mode === NMode.J2000)
      return pos;

    let eclipticPosition = this.equatorialToEcliptic(pos, time_JDE, mode);

    eclipticPosition = this.nutateEclipticPosition(eclipticPosition, time_JDE, mode);

    return this.eclipticToEquatorial(eclipticPosition, time_JDE, mode);
  }

  nutateEquatorialPosition3D(pos: SphericalPosition3D, time_JDE: number, mode = NMode.NUTATED): SphericalPosition3D {
    if (mode === NMode.J2000)
      return pos;

    return SphericalPosition3D.from2D(this.nutateEquatorialPosition(pos, time_JDE, mode), pos.radius);
  }

  eclipticToEquatorial(pos: SphericalPosition, time_JDE = JD_J2000, mode = NMode.J2000): SphericalPosition {
    const nutation = this.getNutation(time_JDE, mode);
    const L = pos.rightAscension;
    const B = pos.declination;
    const E = nutation.ε;

    return new SphericalPosition(
                  Angle.atan2_nonneg(L.sin * E.cos - B.tan * E.sin, L.cos),
                  Angle.asin(limitNeg1to1(B.sin * E.cos + B.cos * E.sin * L.sin)));
  }

  eclipticToEquatorial3D(pos: SphericalPosition3D, time_JDE = JD_J2000, mode = NMode.J2000): SphericalPosition3D {
    return SphericalPosition3D.from2D(this.eclipticToEquatorial(pos, time_JDE, mode), pos.radius);
  }

  equatorialToEcliptic(pos: SphericalPosition, time_JDE = JD_J2000, mode = NMode.J2000): SphericalPosition {
    const nutation = this.getNutation(time_JDE, mode);
    const RA = pos.rightAscension;
    const dec = pos.declination;
    const E = nutation.ε;

    return new SphericalPosition(
                  Angle.atan2_nonneg(RA.sin * E.cos + dec.tan * E.sin, RA.cos),
                  Angle.asin(limitNeg1to1(dec.sin * E.cos - dec.cos * E.sin * RA.sin)));
  }

  equatorialToEcliptic3D(pos: SphericalPosition3D, time_JDE = JD_J2000, mode = NMode.J2000): SphericalPosition3D {
    return SphericalPosition3D.from2D(this.equatorialToEcliptic(pos, time_JDE, mode), pos.radius);
  }
}
