/*
  Copyright © 2017-2021 Kerry Shetline, kerry@shetline.com

  MIT license: https://opensource.org/licenses/MIT

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
  persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
  Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
import { getDeltaTAtJulianDate as gdt, utToTdt, tdtToUt } from '@tubular/time';

export * from './additional-orbiting-objects';
export * from './astro-constants';
export * from './astronomy-util';
export * from './ecliptic';
export * from './event-finder';
export * from './i-astro-data.service';
export * from './i-sky-observer';
export * from './jupiter-info';
export * from './jupiter-moons';
export * from './meeus-moon';
export * from './planetary-moons';
export * from './pluto';
export * from './saturn-moons';
export * from './sky-observer';
export * from './solar-system';
export * from './star-catalog';
export * from './vsop87-planets';

/**
 * @deprecated Use @tubular/time getDeltaTAtJulianDate() instead.
 */
export const getDeltaTAtJulianDate = gdt;

/**
 * @deprecated Use @tubular/time utToTdt() instead.
 */
export const UT_to_TDB = utToTdt;

/**
 * @deprecated Use @tubular/time tdtToUt() instead.
 */
export const TDB_to_UT = tdtToUt;
