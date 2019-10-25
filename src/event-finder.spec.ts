import { KsDateTime, KsTimeZone } from 'ks-date-time-zone';
import { FIRST_QUARTER, FULL_MOON, GREATEST_ELONGATION, GRS_TRANSIT_EVENT, JUPITER, MOON, RISE_EVENT, SET_EVENT, SOLAR_ECLIPSE, SUN, VENUS } from './astro-constants';
import { EventFinder } from './event-finder';
import { IAstroDataService } from './i-astro-data.service';
import { JupiterInfo } from './jupiter-info';
import { SkyObserver } from './sky-observer';
import { AsteroidCometInfo, EclipseInfo } from './solar-system';

const grsTestData = new Uint8ClampedArray(
`3.9
13.0
366.0
2017-01-01,261.0
2017-04-01,267.0
2017-07-01,274.0
2017-10-01,278.5
2018-01-01,285.0`.split('').map(c => c.charCodeAt(0))).buffer;

let promiseHelper;

const grsPromise = new Promise<ArrayBuffer>((resolve, reject) => {
  promiseHelper = {resolve, reject};
});

class MockAstroDataService implements IAstroDataService {
  getStars(): Promise<ArrayBuffer> {
    return null;
  }

  getGrsData(): Promise<ArrayBuffer> {
    return grsPromise;
  }

  getAsteroidData(): Promise<AsteroidCometInfo[]> {
    return null;
  }

  getCometData(): Promise<AsteroidCometInfo[]> {
    return null;
  }
}

let jupiterInfo: JupiterInfo;

JupiterInfo.getJupiterInfo(new MockAstroDataService()).then(ji => jupiterInfo = ji );
promiseHelper.resolve(grsTestData);

describe('EventFinder', () => {
  const eventFinder = new EventFinder();
  const zone = KsTimeZone.getTimeZone('America/New_York');
  const time = new KsDateTime({y: 2018, m: 2, d: 11, hrs: 20, min: 0, sec: 0}, zone);
  const jdu = KsDateTime.julianDay(time.utcTimeMillis);
  const observer = new SkyObserver(-71.48, 42.75);

  it('should find the next sunrise', () => {
    const event = eventFinder.findEvent(SUN, RISE_EVENT, jdu, observer, zone);
    expect(event.eventTime.wallTime.hrs).toEqual(6);
    expect(event.eventTime.wallTime.min).toEqual(47);
  });

  it('should find the next setting of the moon', () => {
    const event = eventFinder.findEvent(MOON, SET_EVENT, jdu, observer, zone);
    expect(event.eventTime.wallTime.hrs).toEqual(14);
    expect(event.eventTime.wallTime.min).toEqual(23);
  });

  it('should find the next full moon', () => {
    const event = eventFinder.findEvent(MOON, FULL_MOON, jdu, observer, zone);
    expect(event.eventTime.wallTime.m).toEqual(3);
    expect(event.eventTime.wallTime.d).toEqual(1);
    expect(event.eventTime.wallTime.hrs).toEqual(19);
    expect(event.eventTime.wallTime.min).toEqual(51);
  });

  it('should find the next solar eclipse', () => {
    const event = eventFinder.findEvent(SUN, SOLAR_ECLIPSE, jdu, observer, zone);
    expect(event.eventTime.wallTime.y).toEqual(2018);
    expect(event.eventTime.wallTime.m).toEqual(2);
    expect(event.eventTime.wallTime.d).toEqual(15);
    expect(event.eventTime.wallTime.hrs).toEqual(15);
    expect(event.eventTime.wallTime.min).toEqual(51);
    expect((<EclipseInfo> event.miscInfo).surfaceShadow.longitude.degrees).toBeCloseTo(0.80, 1);
    expect((<EclipseInfo> event.miscInfo).surfaceShadow.latitude.degrees).toBeCloseTo(-70.95, 1);
  });

  it('should find the next greatest elongation of Venus', () => {
    const event = eventFinder.findEvent(VENUS, GREATEST_ELONGATION, jdu, observer, zone);
    expect(event.eventTime.wallTime.y).toEqual(2018);
    expect(event.eventTime.wallTime.m).toEqual(8);
    expect(event.eventTime.wallTime.d).toEqual(17);
    expect(event.eventTime.wallTime.hrs).toEqual(14);
  });

  it('should find the previous first quarter moon', () => {
    const event = eventFinder.findEvent(MOON, FIRST_QUARTER, jdu, observer, zone, null, true);
    expect(event.eventTime.wallTime.m).toEqual(1);
    expect(event.eventTime.wallTime.d).toEqual(24);
    expect(event.eventTime.wallTime.hrs).toEqual(17);
    expect(event.eventTime.wallTime.min).toEqual(20);
  });

  it('should resolve the promise for GRS data and find next GRS transit', done => {
    grsPromise.then(() => {
      expect(jupiterInfo).toBeDefined();

      const eventFinder2 = new EventFinder(jupiterInfo);
      const time2 = new KsDateTime({y: 2017, m: 7, d: 1, hrs: 0, min: 0, sec: 0}, KsTimeZone.UT_ZONE);
      const jdu2 = KsDateTime.julianDay(time2.utcTimeMillis);
      const event = eventFinder2.findEvent(JUPITER, GRS_TRANSIT_EVENT, jdu2, observer);
      expect(event.eventTime.wallTime.hrs).toEqual(2);
      expect(event.eventTime.wallTime.min).toEqual(31);

      done();
    });
  });
});
