import { abs, mod2 } from '@tubular/math';
import ttime from '@tubular/time';
import { expect } from 'chai';
import { SkyObserver } from './sky-observer';
import { StarCatalog } from './star-catalog';

describe('StarCatalog', () => {
  it('should create StarCatalog', (done) => {
    const observer = new SkyObserver(-71.5, 42.5);
    const sc = new StarCatalog('src/resources/stars.dat', (initialized) => {
      expect(initialized).to.be.true;
      expect(sc.isProperlyInitialized()).to.be.true;
      expect(sc.getStarCount()).to.be.greaterThan(7000);
      expect(sc.getFk5Star(907)?.name).to.equal('Polaris');
      expect(sc.getStarByName('Polaris')?.codedName).to.equal('1 Alp UMi');
      expect(sc.getStarByName('Ruchbah')?.fk5Num).to.equal(48);
      expect(sc.getStarByName('Sirius')?.vmag).to.be.lessThan(-1);
      expect(sc.getBrightStarCatalogStar(5062)?.name).to.equal('Alcor');
      expect(sc.getHipparcosStar(41986)?.codedName).to.equal('HC 41986');
      expect(sc.getHipparcosStar(43575)?.vmag).approximately(6.3, 0.001);
      expect(sc.getMagnitude(299)).approximately(6.3, 0.001);
      expect(sc.getDsoByMessierNumber(33)?.name).to.equal('Triangulum galaxy');
      expect(sc.getMessierNumber(sc.getDsoByMessierNumber(31)?.catalogIndex)).to.equal(31);
      expect(sc.getStarInfo(sc.getStarCount() - 1)?.name).to.equal('Sirius');
      expect(sc.getExpandedName(sc.getStarByName('Andromeda galaxy')?.catalogIndex)).to.equal('M31 - Andromeda galaxy');
      expect(sc.getFK5Number(sc.getStarCount() - 1)).to.equal(257);
      expect(sc.getBSCNumber(2000)).to.equal(3656);
      expect(sc.getMessierNumber(6817)).to.equal(7);
      expect(sc.getNgcNumber(198)).to.equal(6254);
      expect(sc.getIcNumber(6)).to.equal(2118);
      expect(sc.getDsoByNgcNumber(2685)?.name).to.equal('Helix galaxy');
      expect(sc.getDsoByIcNumber(434)?.name).to.equal('Horsehead nebula');
      expect(sc.getBayerRank(sc.getStarByName('Sirius')?.catalogIndex)).to.equal(1);
      expect(sc.getBayerRank(sc.getStarByName('Betelgeuse')?.catalogIndex)).to.equal(1);
      expect(sc.constellationCode(sc.getConstellationOfStar(sc.getStarByName('Mintaka')?.catalogIndex))).to.equal('Ori');
      expect(sc.constellationName(sc.getConstellationOfStar(sc.getStarByName('Mintaka')?.catalogIndex))).to.equal('Orion');
      expect(sc.getEquatorialPosition(sc.getStarByName('Polaris')?.catalogIndex, ttime('2021-01-01Z').wallTime.jde)
        .latitude.degrees).to.be.greaterThan(89);
      expect(abs(mod2(sc.getEclipticPosition(sc.getBrightStarCatalogStar(9047)?.catalogIndex, ttime('2021-01-01Z').wallTime.jde)
        .longitude.degrees, 360))).to.be.lessThan(1);
      expect(sc.getHorizontalPosition(sc.getStarByName('Alnitak')?.catalogIndex, ttime('2010-10-10 EDT').wallTime.jdu, observer)
        .latitude.degrees).approximately(7.366, 0.002);
      expect(sc.getConstellationCount()).to.equal(89);
      sc.forEachConstellation(c => expect(c.code).to.equal(sc.constellationCode(c.index)) as any);
      done();
    });
  });
});
