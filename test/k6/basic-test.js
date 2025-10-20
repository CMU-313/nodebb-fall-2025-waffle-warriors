// Written by GPT
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,           // number of virtual users
  duration: '10s',  // total test duration
};

export default function () {
  // Use 127.0.0.1 so k6 can reach NodeBB within the same devcontainer
  const baseUrl = 'http://127.0.0.1:4567';

  const urls = [
    `${baseUrl}/`          // homepage
  ];

  for (const url of urls) {
    const res = http.get(url);
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
  }
}


