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
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };

    xhr.onerror = function (): void {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };

    xhr.send();
  });
}

export class SimpleAstroDataService implements IAstroDataService {
  constructor(private baseUrl: string) {}

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
