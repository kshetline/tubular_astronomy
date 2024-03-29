/*
  This is an implementation of the method of computing Saturn's moons created
  by Gérard Dourneau, as presented by Jean Meeus.
*/

import { abs, asin_deg, atan2, atan2_deg, cos, cos_deg, sin, sin_deg, SphericalPosition3D, sqrt, squared, to_degree } from '@tubular/math';
import { DELAYED_TIME, FIRST_SATURN_MOON, JD_B1950, LAST_SATURN_MOON, SATURN, SATURN_FLATTENING } from './astro-constants';
import { Ecliptic } from './ecliptic';
import { MoonInfo, PlanetaryMoons } from './planetary-moons';

const s1 = sin_deg(28.0817);
const c1 = cos_deg(28.0817);
const s2 = sin_deg(168.8112);
const c2 = cos_deg(168.8112);

interface OuterMoonInfo {
  λ: number;
  γ: number;
  ω: number;
  r: number;
}

export class SaturnMoons extends PlanetaryMoons {
  private static initialized = false;

  constructor() {
    super();

    if (!SaturnMoons.initialized) {
      PlanetaryMoons.registerMoonNames(FIRST_SATURN_MOON, LAST_SATURN_MOON,
        ['Mimas', 'Enceladus', 'Tethys', 'Dione', 'Rhea', 'Titan', 'Hyperion', 'Iapetus'],
        []);
      SaturnMoons.initialized = true;
    }

    this.flattening = SATURN_FLATTENING;
  }

  protected getMoonPositionsAux(time_JDE: number, sunPerspective: boolean): MoonInfo[] {
    // Adapted from _Astronomical Algorithms, 2nd Ed._ by Jean Meeus
    // pp. 323-333.

    const nmoons = LAST_SATURN_MOON - FIRST_SATURN_MOON + 1;
    const moons: MoonInfo[] = [];
    const lightDelay = time_JDE - this.solarSystem.getEclipticPosition(SATURN, time_JDE, null, DELAYED_TIME).radius;
    let spos: SphericalPosition3D;

    if (sunPerspective)
      spos = this.solarSystem.getHeliocentricPosition(SATURN, time_JDE - lightDelay);
    else
      spos = this.solarSystem.getEclipticPosition(SATURN, time_JDE - lightDelay, null, 0);

    spos = Ecliptic.precessEcliptical3D(spos, time_JDE, JD_B1950);

    const L0 = spos.longitude.degrees;
    const B0 = spos.latitude.degrees;
    const Δ = spos.radius;

    const t = time_JDE - lightDelay;
    const t1  = t - 2411093;
    const t2  = t1 / 365.25;
    const t3  = (t - 2433282.423) / 365.25 + 1950;
    const t4  = t - 2411368;
    const t5  = t4 / 365.25;
    const t6  = t - 2415020;
    const t7  = t6 / 36525;
    const t8  = t6 / 365.25;
    const t9  = (t - 2442000.5) / 365.25;
    const t10 = t - 2409786;
    const t11 = t10 / 36525;

    const W0 = 5.095 * (t3 - 1866.39);
    const W1 = 74.4 + 32.39 * t2;
    const W2 = 134.3 + 92.62 * t2;
    const W3 = 42 - 0.5118 * t5;
    const W4 = 276.59 + 0.5118 * t5;
    const W5 = 267.2635 + 1222.1136 * t7;
    const W6 = 175.4762 + 1221.5515 * t7;
    const W7 = 2.4891 + 0.002435 * t7;
    const W8 = 113.35 - 0.2597 * t7;

    let λ = 0, r = 0, γ = 0, Ω = 0, K = 0;
    let W: number;
    let L: number;
    let p = 0;
    let M: number;
    let C: number;
    let u: number;
    let ω: number;
    const X: number[] = [];
    const Y: number[] = [];
    const Z: number[] = [];

    for (let j = 0; j < nmoons; ++j) {
      switch (j) {
        case 0: // I, Mimas
          L = 127.64 + 381.994497 * t1 - 43.57 * sin_deg(W0) - 0.720 * sin_deg(3 * W0)
              - 0.02144 * sin(5 * W0);
          p = 106.1 + 365.549 * t2;
          M = L - p;
          C = 2.18287 * sin_deg(M) + 0.025988 * sin_deg(2 * M) + 0.00043 * sin_deg(3 * M);
          λ = L + C;
          r = 3.06879 / (1 + 0.01905 * cos_deg(M + C));
          γ = 1.563;
          Ω = 54.5 - 365.072 * t2;
          K = 20947;
          break;

        case 1: // II, Enceladus
          L = 200.317 + 262.7319002 * t1 + 0.25667 *  sin_deg(W1) + 0.20883 * sin_deg(W2);
          p = 309.107 + 123.44121 * t2;
          M = L - p;
          C = 0.55577 * sin_deg(M) + 0.00168 * sin_deg(2 * M);
          λ = L + C;
          r = 3.94118 / (1 + 0.00485 * cos_deg(M + C));
          γ = 0.0262;
          Ω = 348 - 151.95 * t2;
          K = 23715;
          break;

        case 2: // III, Tethys
          λ = 285.306 + 190.69791226 * t1 + 2.063 * sin_deg(W0)
                 + 0.03409 * sin_deg(3 * W0) + 0.001015 * sin_deg(5 * W0);
          r = 4.880998;
          γ = 1.0976;
          Ω = 111.33 - 72.2441 * t2;
          K = 26382;
          break;

        case 3: // IV, Dione
          L = 254.712 + 131.53493193 * t1 - 0.0215 * sin_deg(W1) - 0.01733 * sin_deg(W2);
          p = 174.8 + 30.820 * t2;
          M = L - p;
          C = 0.24717 * sin_deg(M) + 0.00033 * sin_deg(2 * M);
          λ = L + C;
          r = 6.24871 / (1 + 0.002157 * cos_deg(M + C));
          γ = 0.0139;
          Ω = 232 - 30.27 * t2;
          K = 29876;
          break;

        case 4: // Outer moons
        case 5:
        case 6:
        case 7:
          /* eslint-disable no-case-declarations */
          let p1: number, a1: number, a2: number, N: number, i1: number, Ω1: number;
          let g0: number, ψ: number, s: number, g: number, ww = 0, e1: number, q: number;
          let b1, b2, θ, h;
          let η, ζ, θ1, as, bs, cs, φ, χ;
          let ww1, ww0, μ, l, g1, ls, gs, lT, gT, u1, u2, u3, u4, u5, w1, Φ;
          let e = 0, a = 0, i = 0, λ1 = 0;

          switch (j) {
            case 4: // V, Rhea
              p1 = 342.7 + 10.057 * t2;
              a1 = 0.000265 * sin_deg(p1) + 0.01 * sin_deg(W4);
              a2 = 0.000265 * cos_deg(p1) + 0.01 * cos_deg(W4);
              e = sqrt(a1 ** 2 + a2 ** 2);
              p = atan2_deg(a1, a2);
              N = 345 - 10.057 * t2;
              λ1 = 359.244 + 79.69004720 * t1 + 0.086754 * sin_deg(N);
              i = 28.0362 + 0.346890 * cos_deg(N) + 0.01930 * cos_deg(W3);
              Ω = 168.8034 + 0.73693 * sin_deg(N) + 0.041 * sin_deg(W3);
              a = 8.725924;
              // Not used: M = lambda1 - p;
              K = 35313;
              break;

            case 5: // VI, Titan
              L = 261.1582 + 22.57697855 * t4 + 0.074025 * sin_deg(W3);
              i1 = 27.45141 + 0.295999 * cos_deg(W3);
              Ω1 = 168.66925 + 0.628808 * sin_deg(W3);
              a1 = sin_deg(W7) * sin_deg(Ω1 - W8);
              a2 = cos_deg(W7) * sin_deg(i1) - sin_deg(W7) * cos_deg(i1) * cos_deg(Ω1 - W8);
              g0 = 102.8623;
              ψ = atan2_deg(a1, a2);
              s = sqrt(a1 ** 2 + a2 ** 2);
              g = W4 - Ω1 - ψ;

              for (let k = 0; k < 3; ++k) {
                ww = W4 + 0.37515 * (sin_deg(2 * g) - sin_deg(2 * g0));
                g = ww - Ω1 - ψ;
              }

              e1 = 0.029092 + 0.00019048 * (cos_deg(2 * g) - cos_deg(2 * g0));
              q = 2 * (W5 - ww);
              b1 = sin_deg(i1) * sin_deg(Ω1 - W8);
              b2 = cos_deg(W7) * sin_deg(i1) * cos_deg(Ω1 - W8) - sin_deg(W7) * cos_deg(i1);
              θ = atan2_deg(b1, b2) + W8;
              e = e1 + 0.002778797 * e1 * cos_deg(q);
              p = ww + 0.159215 * sin_deg(q);
              u = 2 * W5 - 2 * θ + ψ;
              h = 0.9375 * e1 ** 2 * sin_deg(q) + 0.1875 * s ** 2 * sin_deg(2 * (W5 - θ));
              λ1 = L - 0.254744 * (e1 * sin_deg(W6) + 0.75 * e1 ** 2 * sin_deg(2 * W6) + h);
              i = i1 + 0.031843 * s * cos_deg(u);
              Ω = Ω1 + 0.031843 * s * sin_deg(u) / sin_deg(i1);
              a = 20.216193;
              K = 53800;
              break;

            case 6: // VII, Hyperion
              η = 92.39 + 0.5621071 * t6;
              ζ = 148.19 - 19.18 * t8;
              θ = 184.8 - 35.41 * t9;
              θ1 = θ - 7.5;
              as = 176 + 12.22 * t8;
              bs = 8 + 24.44 * t8;
              cs = bs + 5;
              ww = 69.898 - 18.67088 * t8;
              φ = 2 * (ww - W5);
              χ = 94.9 - 2.292 * t8;
              a = 24.50601 - 0.08686 * cos_deg(η) - 0.00166 * cos_deg(ζ + η)
                  + 0.00175 * cos_deg(ζ - η);
              e = 0.103458 - 0.004099 * cos_deg(η) - 0.000167 * cos_deg(ζ + η)
                  + 0.000235 * cos_deg(ζ - η) + 0.02303 * cos_deg(ζ)
                  - 0.00212 * cos_deg(2 * ζ)
                  + 0.000151 * cos_deg(3 * ζ) + 0.00013 * cos_deg(φ);
              p = ww + 0.15648 * sin_deg(χ) - 0.4457 * sin_deg(η) - 0.2657 * sin_deg(ζ + η)
                  - 0.3573 * sin_deg(ζ - η) - 12.872 * sin_deg(ζ) + 1.668 * sin_deg(2 * ζ)
                  - 0.2419 * sin_deg(3 * ζ) - 0.07 * sin_deg(φ);
              λ1 = 177.047 + 16.91993829 * t6 + 0.15648 * sin_deg(χ) + 9.142 * sin_deg(η)
                      + 0.007 * sin_deg(2 * η) - 0.014 * sin_deg(3 * η)
                      + 0.2275 * sin_deg(ζ + η)
                      + 0.2112 * sin_deg(ζ - η) - 0.26 * sin_deg(ζ)
                      - 0.0098 * sin_deg(2 * ζ)
                      - 0.013 * sin_deg(as) + 0.017 * sin_deg(bs) - 0.0303 * sin_deg(φ);
              i = 27.3347 + 0.643486 * cos_deg(χ) + 0.315 * cos_deg(W3) + 0.018 * cos_deg(θ)
                  - 0.018 * cos_deg(cs);
              Ω = 168.6812 + 1.40136 * cos_deg(χ) + 0.68599 * sin_deg(W3)
                    - 0.0392 * sin_deg(cs) + 0.0366 * sin_deg(θ1);
              K = 59222;
              break;

            case 7: // VII, Iapetus
              L = 261.1582 + 22.57697855 * t4;
              ww1 = 91.769 + 0.562 * t7;
              ψ = 4.367 - 0.195 * t7;
              θ = 146.819 - 3.198 * t7;
              φ = 60.470 + 1.521 * t7;
              Φ = 205.055 - 2.091 * t7;
              e1 = 0.028298 + 0.001156 * t11;
              ww0 = 352.91 + 11.71 * t11;
              μ = 76.3852 + 4.53795125 * t10;
              i1 = 18.4602 - 0.9518 * t11 - 0.072 * t11 ** 2 + 0.0054 * t11 ** 3;
              Ω1 = 143.198 - 3.919 * t11 + 0.116 * t11 ** 2 + 0.008 * t11 ** 3;
              l = μ - ww0;
              g = ww0 - Ω1 - ψ;
              g1 = ww0 - Ω1 - φ;
              ls = W5 - ww1;
              gs = ww1 - θ;
              lT = L - W4;
              gT = W4 - Φ;
              u1 = 2 * (l + g - ls - gs);
              u2 = l + g1 - lT - gT;
              u3 = l + 2 * (g - ls - gs);
              u4 = lT + gT - g1;
              u5 = 2 * (ls + gs);
              a = 58.935028 + 0.004638 * cos_deg(u1) + 0.058222 * cos_deg(u2);
              e = e1 - 0.0014097 * cos_deg(g1 - gT) + 0.0003733 * cos_deg(u5 - 2 * g)
                  + 0.0001180 * cos_deg(u3) + 0.0002408 * cos_deg(l)
                  + 0.0002849 * cos_deg(l + u2) + 0.0006190 * cos_deg(u4);
              ω = 0.08077 * sin_deg(g1 - gT) + 0.02139 * sin_deg(u5 - 2 * g) - 0.00676 * sin_deg(u3)
                  + 0.01380 * sin_deg(l) + 0.01632 * sin_deg(l + u2) + 0.03547 * sin_deg(u4);
              p = ww0 + ω / e1;
              λ1 = μ - 0.04299 * sin_deg(u2) - 0.00789 * sin_deg(u1) - 0.06312 * sin_deg(ls)
                      - 0.00295 * sin_deg(2 * ls) - 0.02231 * sin_deg(u5) + 0.00650 * sin_deg(u5 + ψ);
              i = i1 + 0.04204 * cos_deg(u5 + ψ) + 0.00235 * cos_deg(l + g1 + lT + gT + φ)
                  + 0.00360 * cos_deg(u2 + φ);
              w1 = 0.04204 * sin_deg(u5 + ψ) + 0.00235 * sin_deg(l + g1 + lT + gT + φ)
                   + 0.00358 * sin_deg(u2 + φ);
              Ω = Ω1 + w1 / sin_deg(i1);
              K = 91820;
              break;
          }

          M = λ1 - p;
          const omi = SaturnMoons.solveOuterMoon(e, M, a, Ω, i, λ1);

          λ = omi.λ;
          γ = omi.γ;
          Ω = omi.ω;
          r = omi.r;
          break;
      }

      u = λ - Ω;
      ω = Ω - 168.8112;

      X[j] = r * (cos_deg(u) * cos_deg(ω) - sin_deg(u) * cos_deg(γ) * sin_deg(ω));
      Y[j] = r * (sin_deg(u) * cos_deg(ω) * cos_deg(γ) + cos_deg(u) * sin_deg(ω));
      Z[j] = r * sin_deg(u) * sin_deg(γ);
    }

    // Now we set up a fictitious moon.
    X[nmoons] = 0;
    Y[nmoons] = 0;
    Z[nmoons] = 1;

    let A1: number, A2: number, A3: number, A4: number;
    let B1: number, B2: number, B3: number, B4: number;
    let C1: number, C2: number, C3: number, C4: number;
    let D = 0;
    let Y1: number;
    let moon: MoonInfo;

    // We'll loop backwards so we can compute D from the fictitious moon first.
    for (let j = nmoons; j >= 0; --j) {
      // Rotate towards the plane of the ecliptic
      A1 = X[j];
      B1 = c1 * Y[j] - s1 * Z[j];
      C1 = s1 * Y[j] + c1 * Z[j];
      // Rotate towards the vernal equinox
      A2 = c2 * A1 - s2 * B1;
      B2 = s2 * A1 + c2 * B1;
      C2 = C1;
      // Meeus does not explain these last two rotations, but they're
      // obviously related to accounting for the location of Saturn.
      A3 = A2 * sin_deg(L0) - B2 * cos_deg(L0);
      B3 = A2 * cos_deg(L0) + B2 * sin_deg(L0);
      C3 = C2;

      A4 = A3;
      B4 = C3 * sin_deg(B0) + B3 * cos_deg(B0);
      C4 = C3 * cos_deg(B0) - B3 * sin_deg(B0);

      if (j === nmoons)
        D = atan2(A4, C4);
      else {
        X[j] = A4 * cos(D) - C4 * sin(D);
        Y[j] = A4 * sin(D) + C4 * cos(D);
        Z[j] = B4;

        W = Δ / (Δ + Z[j] / 2475);

        X[j] += abs(Z[j]) / K * sqrt(1 - squared(X[j] / r));
        X[j] *= W;
        Y[j] *= W;

        moon = {} as MoonInfo;
        moon.moonIndex = j + FIRST_SATURN_MOON;
        moon.X = X[j];
        moon.Y = Y[j];
        moon.Z = Z[j];
        moon.inferior = (moon.Z <= 0);
        Y1 = moon.Y * this.flattening;
        moon.withinDisc = (sqrt(moon.X * moon.X + Y1 ** 2) < 1);
        moon.inFrontOfDisc = moon.withinDisc && moon.inferior;
        moon.behindDisc = moon.withinDisc && !moon.inferior;

        moons[j] = moon;
      }
    }

    return moons;
  }

  private static solveOuterMoon(e, M, a, Ω, i, lambda1): OuterMoonInfo {
    const omi = {} as OuterMoonInfo;
    const e2 = e ** 2;
    const e3 = e2 * e;
    const e4 = e3 * e;
    const e5 = e4 * e;

    const C = to_degree((2 * e - 0.25 * e3 + 0.0520833333 * e5) * sin_deg(M)
              + (1.25 * e2 - 0.458333333 * e4) * sin_deg(2 * M)
              + (1.083333333 * e3 - 0.671875 * e5) * sin_deg(3 * M)
              + 1.072917 * e4 * sin_deg(4 * M) + 1.142708 * e5 * sin_deg(5 * M));

    omi.r = a * (1 - e2) / (1 + e * cos_deg(M + C));

    const g = Ω - 168.8112;
    const a1 = sin_deg(i) * sin_deg(g);
    const a2 = c1 * sin_deg(i) * cos_deg(g) - s1 * cos_deg(i);

    omi.γ = asin_deg(sqrt(a1 ** 2 + a2 ** 2));

    const u = atan2_deg(a1, a2);

    omi.ω = 168.8112 + u;

    const h = c1 * sin_deg(i) - s1 * cos_deg(i) * cos_deg(g);
    const psi = atan2_deg(s1 * sin_deg(g), h);

    omi.λ = lambda1 + C + u - g - psi;

    return omi;
  }
}
