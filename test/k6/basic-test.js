// Written by GPT
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 10 },  // ramp up to 10 users
    { duration: '40s', target: 50 },  // hold at 50 users
    { duration: '20s', target: 0 },   // ramp down to 0 users
  ],
};

export default function () {
  const baseUrl = 'http://127.0.0.1:4567';

  const urls = [
    `${baseUrl}/`,         // homepage
    // Add more endpoints here, e.g. `${baseUrl}/api/topics`
  ];

  for (const url of urls) {
    const res = http.get(url);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1); // simulate user think time
  }
}



