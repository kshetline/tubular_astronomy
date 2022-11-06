// Note: I've modified the standard refraction formulas so that if they are
// fed values well below the horizon they won't return weird values, but will
// instead make a smooth transition between -2 and -4 degrees to an identity
// function for angles from -4 to -90 degrees.

// Degrees in, degrees out.
//

import { Angle, floor, interpolate, limitNeg1to1, max, min, pow, round, SphericalPosition, sqrt, tan_deg, Unit } from '@tubular/math';
import { blendColors } from '@tubular/util';
import { GALACTIC_ASCENDING_NODE_B1950, GALACTIC_NORTH_B1950, JD_B1950, JD_J2000, LOW_PRECISION, MOON, QUICK_SUN, SUN } from './astro-constants';
import { Ecliptic } from './ecliptic';
import { ISkyObserver } from './i-sky-observer';
import { SolarSystem } from './solar-system';

export const COLOR_NIGHT                 = 'black';
export const COLOR_ASTRONOMICAL_TWILIGHT = '#000044';
export const COLOR_NAUTICAL_TWILIGHT     = '#000066';
export const COLOR_CIVIL_TWILIGHT        = '#990066';
export const COLOR_NEAR_SUNRISE          = '#CC6600';
export const COLOR_EARLY_SUNRISE         = '#DDBB33';
export const COLOR_LATE_SUNRISE          = '#DDDDAA';
export const COLOR_DAY                   = '#99CCFF';

export const COLORS_MOONLIGHT: string[] = ['black', '#333333', '#666666', '#999999'];

const COLORS_DEEP_TWILIGHT: string[] = [COLOR_ASTRONOMICAL_TWILIGHT, COLOR_NAUTICAL_TWILIGHT];
const TWILIGHT_MOON_BLENDS: string[][] = [];

(function (): void {
  for (let i = 0; i < 2; ++i) {
    TWILIGHT_MOON_BLENDS[i] = [];

    for (let j = 0; j < 3; ++j)
      TWILIGHT_MOON_BLENDS[i][j] = blendColors(COLORS_DEEP_TWILIGHT[i], COLORS_MOONLIGHT[j + 1]);
  }
})();

const h_adj  = refractedAltitudeAux(90);
const h0_adj = unrefractedAltitudeAux(90);

export function refractedAltitude(trueAltitude: number): number {
  if (trueAltitude < -4)
    return trueAltitude;

  const h2 = trueAltitude + refractedAltitudeAux(trueAltitude) - h_adj;

  if (trueAltitude < -2)
    return interpolate(-4, trueAltitude, -2, trueAltitude, h2);
  else
    return h2;
}

function refractedAltitudeAux(h: number): number {
  // Tweaked a little for agreement with standard of 0.5833 degrees at horizon
  // (Original form was 1.02 / tan_deg(h... ))
  return 1.033879 / tan_deg(h + 10.3 / (h + 5.11)) / 60;
}

// Degrees in, degrees out.
//
export function unrefractedAltitude(apparentAltitude: number): number {
  if (apparentAltitude < -4)
    return apparentAltitude;

  const h2 = apparentAltitude - unrefractedAltitudeAux(apparentAltitude) + h0_adj;

  if (apparentAltitude < -2)
    return interpolate(-4, apparentAltitude, -2, apparentAltitude, h2);
  else
    return h2;
}

function unrefractedAltitudeAux(h0: number): number {
  // Tweaked a little for agreement with standard of 0.5833 degrees at horizon
  // (Original form was 1 / tan_deg(h0... ))
  return 1.015056 / tan_deg(h0 + 7.31 / (h0 + 4.4)) / 60;
}

export function getSkyColor(sunPos: SphericalPosition, skyPos: SphericalPosition, eclipseTotality = 0): string {
  const sunAltitude = sunPos.altitude.degrees;

  if (sunAltitude <= -18)
    return 'black';

  let   elongation  = skyPos.distanceFrom(sunPos).degrees;
  const skyAltitude = skyPos.altitude.degrees;

  const shade     = min((18 + sunAltitude) / 18, 1);
  const sunRed    = min(1.2 * shade, 1);
  const sunGreen  = pow(shade, 1.6);
  const sunBlue   = 0.8 * pow(0.8 * shade, 2.2);
  const baseRed   = 0.4 * shade;
  const baseGreen = 0.6 * shade;
  const baseBlue  = shade;

  if (sunAltitude < 0)
    elongation = max(elongation + sunAltitude, 0.20);

  const sunBias  = min(max((45 - elongation) / 45, 0), 1);
  const baseBias = 1 - sunBias / 2.5;
  const altBias  = 1 - (sqrt(max(skyAltitude, 0))) / 30;
  let   eclBias  = 1 - 0.8 * eclipseTotality;

  if (eclipseTotality > 0.99)
    eclBias = 20.8 * (1 - eclipseTotality);

  const r = (sunRed   * sunBias + baseRed * baseBias) * altBias * eclBias;
  const g = (sunGreen * sunBias + baseGreen * baseBias) * altBias * eclBias;
  const b = (sunBlue  * sunBias + baseBlue  * baseBias) * altBias * (0.2 + eclBias * 0.8);
  const scale = 255 / max(r, g, b, 1);

  return 'rgb(' + round(r * scale) + ',' + round(g * scale) + ',' + round(b * scale) + ')';
}

export function getInsolationColor(observer: ISkyObserver, solarSystem: SolarSystem, time_JDU: number, moonlight = false, blendMoonlight = true): string {
  let color: string;
  let twilightIndex = -1;
  let moonIndex: number;
  let altitudeOfMoon: number;
  let illuminationOfMoon: number;
  const altitudeOfSun = solarSystem.getHorizontalPosition(SUN, time_JDU, observer, QUICK_SUN).altitude.degrees;

  if (altitudeOfSun < -18)
    color = COLOR_NIGHT;
  else if (altitudeOfSun < -12) {
    color = COLOR_ASTRONOMICAL_TWILIGHT;
    twilightIndex = 0;
  }
  else if (altitudeOfSun < -6) {
    color = COLOR_NAUTICAL_TWILIGHT;
    twilightIndex = 1;
  }
  else if (altitudeOfSun < -3)
    color = COLOR_CIVIL_TWILIGHT;
  else if (altitudeOfSun < -0.833)
    color = COLOR_NEAR_SUNRISE;
  else if (altitudeOfSun < 4)
    color = COLOR_EARLY_SUNRISE;
  else if (altitudeOfSun < 8)
    color = COLOR_LATE_SUNRISE;
  else
    color = COLOR_DAY;

  if (moonlight && altitudeOfSun < -6) {
    altitudeOfMoon = solarSystem.getHorizontalPosition(MOON, time_JDU, observer, LOW_PRECISION).altitude.degrees;

    if (altitudeOfMoon >= 0) {
      // Technically this should be Dynamical Time, not Universal Time,
      // but the difference is trivial here.
      illuminationOfMoon = solarSystem.getLunarIlluminatedFraction(time_JDU);
      moonIndex = floor((illuminationOfMoon + 0.16) * 3);

      if (moonIndex > 0) {
        if (twilightIndex >= 0 && blendMoonlight)
          color = TWILIGHT_MOON_BLENDS[twilightIndex][moonIndex - 1];
        else
          color = COLORS_MOONLIGHT[moonIndex];
      }
    }
  }

  return color;
}

const A_G = GALACTIC_NORTH_B1950.rightAscension;
const D_G = GALACTIC_NORTH_B1950.declination;
const AN1 = GALACTIC_ASCENDING_NODE_B1950.add(new Angle(270, Unit.DEGREES));
const AN2 = GALACTIC_ASCENDING_NODE_B1950.add(new Angle(90, Unit.DEGREES));
const AG2 = A_G.subtract(new Angle(180, Unit.DEGREES));

export function equatorialToGalactic(pos: SphericalPosition, time_JDE = JD_J2000): SphericalPosition {
  pos = Ecliptic.precessEquatorial(pos, time_JDE, JD_B1950);

  const ga_a = A_G.subtract(pos.rightAscension);
  const d = pos.declination;

  return new SphericalPosition(AN1.subtract(
    Angle.atan2_nonneg(ga_a.sin, ga_a.cos * D_G.sin - d.tan * D_G.cos)),
    Angle.asin(limitNeg1to1(d.sin * D_G.sin + d.cos * D_G.cos * ga_a.cos)));
}

export function galacticToEquatorial(pos: SphericalPosition, time_JDE = JD_J2000): SphericalPosition {
  const l_an2 = pos.rightAscension.subtract(AN2);
  const b = pos.declination;

  pos = new SphericalPosition(AG2.add(
    Angle.atan2_nonneg(l_an2.sin, l_an2.cos * D_G.sin - b.tan * D_G.cos)),
  Angle.asin(limitNeg1to1(b.sin * D_G.sin + b.cos * D_G.cos * l_an2.cos)));

  return Ecliptic.precessEquatorial(pos, JD_B1950, time_JDE);
}
