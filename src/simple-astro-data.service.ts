/*
  Copyright © 2018-2020 Kerry Shetline, kerry@shetline.com

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

import { IAstroDataService } from './i-astro-data.service';
import { AsteroidCometInfo } from './solar-system';

// makeRequest function derived from https://stackoverflow.com/questions/30008114/how-do-i-promisify-native-xhr
function makeRequest(url: string, responseType: XMLHttpRequestResponseType): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('GET', url);
    xhr.responseType = responseType;

    xhr.onload = function (): void {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      }
      else {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };

    xhr.onerror = function (): void {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };

    xhr.send();
  });
}

export class SimpleAstroDataService implements IAstroDataService {
  // eslint-disable-next-line no-useless-constructor
  constructor(private baseUrl: string) {
  }

  getStars(): Promise<ArrayBuffer> {
    return <Promise<ArrayBuffer>> makeRequest(this.baseUrl + 'stars.dat', 'arraybuffer');
  }

  getGrsData(): Promise<ArrayBuffer> {
    return <Promise<ArrayBuffer>> makeRequest(this.baseUrl + 'grs_longitude.txt', 'arraybuffer');
  }

  getAsteroidData(): Promise<AsteroidCometInfo[]> {
    return <Promise<AsteroidCometInfo[]>> makeRequest(this.baseUrl + 'asteroids.json', 'json');
  }

  getCometData(): Promise<AsteroidCometInfo[]> {
    return <Promise<AsteroidCometInfo[]>> makeRequest(this.baseUrl + 'comets.json', 'json');
  }
}
