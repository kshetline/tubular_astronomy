import { DateTime, Timezone, parseISODate } from '@tubular/time';
import {
  abs, Angle, atan, cos, cos_deg, cosh, HALF_PI, interpolate, interpolateModular, log, max, min, mod, PI, pow, sign, signZP,
  sin, sin_deg, sinh, SphericalPosition, SphericalPosition3D, sqrt, tan, to_radian, TWO_PI
} from '@tubular/math';
import { compareCaseSecondary, compareStrings, isNumber, padLeft, replace } from '@tubular/util';
import { ASTEROID_BASE, COMET_BASE, K_DEG, K_RAD, NO_MATCH } from './astro-constants';
import { Ecliptic } from './ecliptic';
import { IAstroDataService } from './i-astro-data.service';
import { AsteroidCometElements, AsteroidCometInfo, OrbitalElements } from './solar-system';

const NEAR_PARABOLIC_E_LOW  = 0.98;
const NEAR_PARABOLIC_E_HIGH = 1.1;

export class ObjectInfo {
  name: string;
  menuName: string;
  shortMenuName: string;
  id: number;
  epoch: number;
  hasMag: boolean;
  asteroid: boolean;
  a: number;  // semi-major axis
  q: number;  // perihelion distance
  e: number;  // eccentricity
  i: number;  // inclination;
  ω: number;  // argument of the perihelion
  L: number;  // longitude of the ascending node
  Tp: number; // time of perihelion passage
  n: number;  // mean daily motion (degrees/day)
  H: number;  // absolute visual magnitude
  G: number;  // slope parameter for magnitude

  convergenceFails: boolean;
  cfMin = Number.MAX_VALUE;
  cfMax = -Number.MAX_VALUE;
  prev: ObjectInfo;
  next: ObjectInfo;

  toString(): string {
    const tEpoch = new DateTime(DateTime.millisFromJulianDay(this.epoch), Timezone.UT_ZONE);
    const epoch = tEpoch.toYMDhmString();
    const tTp = new DateTime(DateTime.millisFromJulianDay(this.Tp), Timezone.UT_ZONE);
    const Tp = tTp.toYMDhmString();

    return `${this.name}: epoch=${epoch}, a=${this.a}, q=${this.q}, e=${this.e}, i=${this.i}, w=${this.ω}, ` +
           `L=${this.L}, Tp=${Tp}, n=${this.n}` +
            (this.hasMag ? `, H=${this.H}, G=${this.G}` : '');
  }
}

export class AdditionalOrbitingObjects {
  private static properlyInitialized: boolean = undefined;
  private static lastAsteroidId = ASTEROID_BASE;
  private static lastCometId = COMET_BASE;
  private static objects: {[id: number]: ObjectInfo[]} = {};
  private static objectIds: number[] = [];

  static getAdditionalOrbitingObjects(astroDataService: IAstroDataService): Promise<AdditionalOrbitingObjects> {
    if (this.properlyInitialized)
      return Promise.resolve(new AdditionalOrbitingObjects());
    else if (this.properlyInitialized === false)
      return Promise.reject(new Error('Failed to initialize AdditionalOrbitingObjects'));
    else {
      return Promise.all([astroDataService.getAsteroidData(), astroDataService.getCometData()]).then((data: AsteroidCometInfo[][]) => {
        this.readElements(data[0], true);
        this.readElements(data[1], false);
        this.properlyInitialized = true;

        return this.getAdditionalOrbitingObjects(astroDataService);
      }).catch((reason: any) => {
        this.properlyInitialized = false;
        return Promise.reject(new Error('Failed to initialize AdditionalOrbitingObjects: ' + reason));
      });
    }
  }

  private static readElements(data: AsteroidCometInfo[], asAsteroids: boolean): void {
    data.forEach((body: AsteroidCometInfo) => {
      const name = body.body.name;
      let shortName = name;
      const matches = /([^(]+) \([^()]+\)/.exec(name);

      if (matches)
        shortName = matches[1];

      const menuNameBase = (asAsteroids ? 'Asteroid: ' : 'Comet: ');
      let id: number;
      const elements: ObjectInfo[] = [];

      if (asAsteroids)
        id = ++this.lastAsteroidId;
      else
        id = ++this.lastCometId;

      body.elements.forEach((element: AsteroidCometElements) => {
        const oi = new ObjectInfo();
        const ymd = parseISODate(element.epoch as string);

        oi.name = name;
        oi.menuName = menuNameBase + name;
        oi.shortMenuName = menuNameBase + shortName;
        oi.id = id;
        oi.epoch = DateTime.julianDay_SGC(ymd.y, ymd.m, ymd.d, 0, 0, 0);
        oi.hasMag = asAsteroids;
        oi.asteroid = asAsteroids;
        oi.a = element.q / (1.0 - element.e);
        oi.q = element.q;
        oi.e = element.e;
        oi.i = element.i;
        oi.ω = (element as any).w ?? element.ω;
        oi.L = element.L;
        oi.Tp = element.Tp;
        oi.n = K_DEG / oi.a / sqrt(oi.a);

        if (asAsteroids) {
          oi.H = body.body.H;
          oi.G = body.body.G;
        }

        elements.push(oi);
      });

      this.objects[id] = elements;
      this.objectIds.push(id);
    });
  }

  // noinspection JSMethodCanBeStatic
  getObjectCount(): number {
    return AdditionalOrbitingObjects.objectIds.length;
  }

  getObjectNames(forMenu = false, shortMenuNames = true): string[] {
    let names: string[] = [];

    AdditionalOrbitingObjects.objectIds.forEach((id: number) => {
      const oia = AdditionalOrbitingObjects.objects[id];

      if (oia.length > 0)
        names.push(oia[0].name + (forMenu ? '\t' +
          (shortMenuNames ? oia[0].shortMenuName : oia[0].menuName) : '')); // In menu form, sort asteroids as one group, comets as another.
    });

    function adjustName(s: string): string {
      s = s.toLowerCase();

      let prefix = '';
      let pos = s.indexOf('\t');

      if (pos >= 0) {
        prefix = s.substring(pos + 1);
        s = s.substring(0, pos);
        prefix = replace(prefix, s, '').trim();
      }

      pos = s.indexOf('/');

      if (pos > 0) {
        let possibleNumPart = s.substring(0, pos);
        const ch = possibleNumPart.charAt(0);

        if (('0' <= ch && ch <= '9') && possibleNumPart.length < 6)
          possibleNumPart = padLeft(possibleNumPart, 6, '0');

        s = s.substring(pos + 1) + '/' + possibleNumPart;
      }

      return prefix + s;
    }

    names.sort((a: string, b: string) => {
      let result = compareStrings(adjustName(a), adjustName(b));

      if (result === 0)
        result = compareCaseSecondary(a, b);

      return result;
    });

    // Strip off the name that was added to menuName to aid sorting
    if (forMenu) {
      names = names.map(name => {
        return name.substring(name.indexOf('\t') + 1);
      });
    }

    return names;
  }

  // noinspection JSMethodCanBeStatic
  getAsteroidCount(): number {
    return AdditionalOrbitingObjects.lastAsteroidId - ASTEROID_BASE;
  }

  // noinspection JSMethodCanBeStatic
  getCometCount(): number {
    return AdditionalOrbitingObjects.lastCometId - COMET_BASE;
  }

  getObjectName(bodyID: number): string {
    const oi = this.getObjectInfo(bodyID);

    if (oi)
      return oi.name;
    else
      return undefined;
  }

  getObjectByName(name: string): number {
    name = name.toLowerCase();

    const matchId = AdditionalOrbitingObjects.objectIds.find(id => {
      const oia = AdditionalOrbitingObjects.objects[id];

      if (oia.length > 0)
        return oia[0].name.toLowerCase() === name || oia[0].menuName.toLowerCase() === name;
      else
        return false;
    });

    if (matchId)
      return matchId;
    else
      return NO_MATCH;
  }

  // noinspection JSMethodCanBeStatic
  protected getObjectInfo(bodyID: number, time_JDE?: number): ObjectInfo {
    if (!AdditionalOrbitingObjects.properlyInitialized)
      return undefined;

    const oia = AdditionalOrbitingObjects.objects[bodyID];

    if (!oia || oia.length === 0)
      return undefined;
    else if (time_JDE === undefined)
      return oia[0];

    if (time_JDE <= oia[0].epoch)
      return oia[0];
    else if (time_JDE >= oia[oia.length - 1].epoch)
      return oia[oia.length - 1];

    for (let i = 0; i < oia.length - 1; ++i) {
      const a = oia[i];
      const b = oia[i + 1];
      const ta = a.epoch;
      const tb = b.epoch;

      if (tb === time_JDE)
        return b;
      else if (ta < time_JDE && time_JDE < tb) {
        const oi = Object.assign(Object.create(Object.getPrototypeOf(a)), a);

        oi.epoch = time_JDE;
        oi.prev = a;
        oi.next = b;
        oi.convergenceFails = (a.convergenceFails || b.convergenceFails);
        oi.cfMin = min(a.cfMin, b.cfMin);
        oi.cfMax = max(a.cfMax, b.cfMax);

        oi.q = interpolate(ta, time_JDE, tb, a.q, b.q);
        oi.e  = interpolate(ta, time_JDE, tb, a.e, b.e);
        oi.i  = interpolateModular(ta, time_JDE, tb, a.i, b.i, 360.0, true);
        oi.w  = interpolateModular(ta, time_JDE, tb, a.ω, b.ω, 360.0);
        oi.L  = interpolateModular(ta, time_JDE, tb, a.L, b.L, 360.0);

        oi.a = oi.q / (1.0 - oi.e);
        oi.n = K_DEG / oi.a / sqrt(oi.a);

        // Tp (time of perihelion) takes a little extra effort to interpolate because the
        // value occasionally jumps from the perihelion of one orbit to the perihelion of
        // the next orbit. We need to normalize these values so that we're referring to the
        // same orbital period when we interpolate.

        let bTp = b.Tp;
        const daysForFullOrbit = 360.0 / oi.n;

        while (bTp >= a.Tp + daysForFullOrbit / 2.0)
          bTp -= daysForFullOrbit;

        while (bTp < a.Tp - daysForFullOrbit / 2.0)
          bTp += daysForFullOrbit;

        oi.Tp = interpolate(ta, time_JDE, tb, a.Tp, bTp);

        return oi;
      }
    }

    return undefined;
  }

  getMagnitudeParameters(bodyID: number): number[] {
    const oi = this.getObjectInfo(bodyID);

    if (oi == null || !oi.hasMag)
      return undefined;
    else
      return [oi.H, oi.G];
  }

  getOrbitalElements(bodyID: number, time_JDE: number): OrbitalElements {
    const oi = this.getObjectInfo(bodyID, time_JDE);

    if (!oi)
      return undefined;

    const oe = {} as OrbitalElements;

    // Handle precession of orbit
    const ΔL = Ecliptic.precessEcliptical(new SphericalPosition(), time_JDE).longitude.degrees;

    oe.a = oi.a;
    oe.e = oi.e;
    oe.i = oi.i;
    oe.Ω = mod(oi.L + ΔL, 360);
    oe.pi = mod(oi.ω + oi.L + ΔL, 360.0);
    oe.partial = true;

    return oe;
  }

  getHeliocentricPosition(objectInfoOrBodyId: ObjectInfo | number, time_JDE: number, doNotConverge = false): SphericalPosition3D {
    let oi: ObjectInfo;

    if (isNumber(objectInfoOrBodyId)) {
      oi = this.getObjectInfo(objectInfoOrBodyId as number, time_JDE);

      if (oi == null)
        return null;
    }
    else
      oi = <ObjectInfo> objectInfoOrBodyId;

    const t = time_JDE - oi.Tp;
    const e = oi.e;
    const a = oi.a;
    const q = oi.q;
    const meanA = mod(oi.n * t, 360.0);
    let ea: number;
    let ef: number;
    let v: number;
    let r: number;

    if (oi.convergenceFails && oi.cfMin <= time_JDE && time_JDE <= oi.cfMax)
      doNotConverge = true;

    if (e === 1.0 || (doNotConverge && abs(e - 1.0) < 0.0001)) { // parabolic orbit
      // Adapted from _Astronomical Algorithms, 2nd Ed._ by Jean Meeus, pp. 241-243.
      const W = 0.03649116245 * t / q / sqrt(q);
      const G = W / 2.0;
      const Y = pow(G + sqrt(G * G + 1.0), 1.0 / 3.0);
      const s = Y - 1.0 / Y;

      r = q * (1.0 + s * s);
      v = 2.0 * atan(s);
    }
    else if (e < NEAR_PARABOLIC_E_LOW || (doNotConverge && e < 1.0)) { // elliptical orbit
      ea = AdditionalOrbitingObjects.kepler(e, to_radian(meanA));

      if (abs(ea) === PI)
        v = PI;
      else {
        ef = sqrt((1.0 + e) / (1.0 - e));
        v = 2.0 * atan(ef * tan(ea / 2.0));
      }

      r = a * (1.0 - e * e) / (1.0 + e * cos(v));
    }
    else if (e > NEAR_PARABOLIC_E_HIGH || doNotConverge) { // hyperbolic orbit
      // Adapted from code by Robert D. Miller.

      ea = AdditionalOrbitingObjects.keplerH(e, to_radian(meanA));
      const sinhEA = sinh(ea);
      const coshEA = cosh(ea);
      ef = sqrt((e + 1.0) / (e - 1.0));
      v = 2.0 * atan(ef * tan(0.5 * ea));
      const rsinv = abs(a) * sqrt(e * e - 1.0) * sinhEA;
      const rcosv = abs(a) * (e - coshEA);
      r = rsinv * rsinv + rcosv * rcosv;
    }
    else { // Near parabolic orbit, eccentricity [0.98, 1.1].
      // Adapted from _Astronomical Algorithms, 2nd Ed._ by Jean Meeus, pp. 245-246.
      if (t === 0.0) {
        r = q;
        v = 0.0;
      }
      else {
        const q1 = K_RAD * sqrt((1.0 + e) / q) / 2.0 / q;
        const q2 = q1 * t;
        let s = 2.0 / 3.0 / abs(q2);

        s = 2.0 / tan(2.0 * atan(pow(tan(atan(s) / 2.0), 1.0 / 3.0))) * sign(t);

        const maxErr = 1E-10;
        const d1 = 10000;
        const g = (1.0 - e) / (1.0 + e);
        let L = 0;
        let s0: number, s1: number;

        do {
          let z = 1;
          const y = s * s;
          let g1 = -y * s;
          let q3 = q2 + 2.0 * g * s * y / 3.0;
          let z1: number, f: number;

          s0 = s;

          do {
            ++z;
            g1 = -g1 * g * y;
            z1 = (z - (z + 1) * g) / (2.0 * z + 1.0);
            f = z1 * g1;
            q3 += f;

            if (z > 50 || abs(f) > d1) {
              AdditionalOrbitingObjects.failedToConverge(1, oi, time_JDE);

              return this.getHeliocentricPosition(oi, time_JDE, true);
            }
          } while (abs(f) > maxErr);

          if (++L > 50) {
            AdditionalOrbitingObjects.failedToConverge(2, oi, time_JDE);

            return this.getHeliocentricPosition(oi, time_JDE, true);
          }

          z = 0;

          do {
            if (++z > 50) {
              AdditionalOrbitingObjects.failedToConverge(3, oi, time_JDE);

              return this.getHeliocentricPosition(oi, time_JDE, true);
            }

            s1 = s;
            s = (2.0 * s * s * s / 3.0 + q3) / (s * s + 1.0);
          } while (abs(s - s1) > maxErr);
        } while (abs(s - s0) > maxErr);

        v = 2.0 * atan(s);
        r = q * (1.0 + e) / (1.0 + e * cos(v));
      }
    }

    // Adapted from _Astronomical Algorithms, 2nd Ed._ by Jean Meeus, p. 233.
    const i = oi.i;
    const L = oi.L;
    const u = to_radian(oi.ω) + v;
    const cosi = cos_deg(i);
    const sini = sin_deg(i);
    const cosL = cos_deg(L);
    const sinL = sin_deg(L);
    const cosu = cos(u);
    const sinu = sin(u);
    const x = r * (cosL * cosu - sinL * sinu * cosi);
    const y = r * (sinL * cosu + cosL * sinu * cosi);
    const z = r * sini * sinu;

    let pos = new SphericalPosition3D(Angle.atan2_nonneg(y, x), Angle.atan2(z, sqrt(x * x + y * y)), r);

    pos = Ecliptic.precessEcliptical3D(pos, time_JDE);

    return pos;
  }

  protected static failedToConverge(code: number, oi: ObjectInfo, time_JDE: number): void {
    oi.convergenceFails = true;
    oi.cfMin = min(time_JDE, oi.cfMin);
    oi.cfMax = max(time_JDE, oi.cfMax);

    if (oi.prev) {
      oi.prev.convergenceFails = true;
      oi.prev.cfMin = min(time_JDE, oi.prev.cfMin);
      oi.prev.cfMax = max(time_JDE, oi.prev.cfMax);
    }

    if (oi.next) {
      oi.next.convergenceFails = true;
      oi.next.cfMin = min(time_JDE, oi.next.cfMin);
      oi.next.cfMax = max(time_JDE, oi.next.cfMax);
    }

//    if (debug)
//      System.err.println("Failed to converge(" + code + ") for " + oi.name + " at JD " + time_JDE + " (" +
//        TimeDateUtil.getISOFormatDateTime(time_JDE) + ")");
  }

  protected static kepler(ecc: number, meanAnomaly: number): number {
    // Binary search solution for Kepler's equation by Roger Sinnott,
    // Adapted from _Astronomical Algorithms, 2nd Ed._ by Jean Meeus
    // p. 206.

    let f: number;
    let e0: number, d: number, m1: number;

    meanAnomaly = mod(meanAnomaly, TWO_PI);

    if (meanAnomaly > PI) {
      meanAnomaly = TWO_PI - meanAnomaly;
      f = -1.0;
    }
    else
      f = 1.0;

    e0 = HALF_PI;
    d = PI / 4.0;

    for (let i = 0; i < 60; ++i) {
      m1 = e0 - ecc * sin(e0);
      e0 = e0 + d * sign(meanAnomaly - m1);
      d /= 2.0;
    }

    return e0 * f;
  }

  protected static keplerH(ecc: number, meanAnomaly: number): number {
    // Solver for hyperbolic form of Kepler's equation using the
    // Laguerre-Conway iteration scheme.
    const maxError = 1.0E-12;
    let h: number, dh: number, f: number, f1: number, f2: number, sine: number, cose: number;

    const meanA = abs(meanAnomaly);
    h = log(2.0 * meanA / ecc + 1.85);

    do {
      sine = sinh(h);
      cose = cosh(h);
      f = ecc * sine - h - meanA;
      f1 = ecc * cose - 1.0;
      f2 = ecc * sine;
      dh = -5.0 * f / (f1 + signZP(f1) * sqrt(abs(16.0 * f1 * f1 - 20.0 * f * f2)));
      h = h + dh;
    } while (abs(dh) >= maxError);

    if (meanAnomaly < 0.0)
      return -h;
    else
      return h;
  }
}
