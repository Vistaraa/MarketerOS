/**
 * Load test for the main read paths (and optional uploads), with pass/fail thresholds.
 * Use a dedicated test account on a staging deployment, never production customer accounts:
 *
 *   k6 run -e BASE_URL=https://staging.example.com -e EMAIL=load@example.com -e PASSWORD=... tests/load/k6-smoke.js
 *   (add -e UPLOADS=1 to include media uploads, -e VUS=50 to change the peak number of virtual users)
 *
 * Sign-in happens once (login is rate limited per IP); every virtual user reuses that session.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const PEAK = Number(__ENV.VUS || 20);

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: PEAK },
        { duration: "2m", target: PEAK },
        { duration: "15s", target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{endpoint:overview}": ["p(95)<1000"],
    "http_req_duration{endpoint:list}": ["p(95)<600"],
    "http_req_duration{endpoint:upload}": ["p(95)<2000"]
  }
};

export function setup() {
  const res = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email: __ENV.EMAIL, password: __ENV.PASSWORD }), { headers: { "content-type": "application/json" } });
  check(res, { "signed in": (r) => r.status === 200 });
  const cookie = /marketeros_session=([^;]+)/.exec(res.headers["Set-Cookie"] || "");
  if (!cookie) throw new Error(`Sign-in failed (${res.status}): ${res.body}`);
  return { cookie: `marketeros_session=${cookie[1]}` };
}

// A 1x1 PNG.
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0, 24, 221, 141, 176, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]).buffer;

export default function browse(data) {
  const params = (endpoint) => ({ headers: { cookie: data.cookie }, tags: { endpoint } });
  check(http.get(`${BASE}/api/v1/overview`, params("overview")), { "overview 200": (r) => r.status === 200 });
  for (const path of ["campaigns", "leads", "clients", "reports", "notifications", "content-studio/templates"]) {
    check(http.get(`${BASE}/api/v1/${path}`, params("list")), { [`${path} 200`]: (r) => r.status === 200 });
  }
  if (__ENV.UPLOADS === "1" && Math.random() < 0.1) {
    const res = http.post(`${BASE}/api/v1/content-studio/media`, { file: http.file(PNG, `load-${__VU}-${__ITER}.png`, "image/png") }, params("upload"));
    check(res, { "upload 201": (r) => r.status === 201 });
  }
  sleep(1 + Math.random() * 2);
}
