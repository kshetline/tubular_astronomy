import ttime from '@tubular/time';
import { expect } from 'chai';
import { SolarSystem } from './solar-system';

describe('SolarSystem', () => {
  const solarSystem = new SolarSystem();

  it('Libration of moon', () => {
    const lib = solarSystem.getLunarLibration(ttime('1992-04-12Z').wallTime.jde);

    expect(lib.l).approximately(-1.205, 0.001);
    expect(lib.b).approximately(4.195, 0.001);
    expect(lib.d).approximately(1946, 1);
    expect(lib.D).approximately(0.002462, 0.000001);
  });
});
