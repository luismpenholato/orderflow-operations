import type { SuperTest, Test } from "supertest";
import type { TestUser } from "./factories.js";
import { TEST_PASSWORD } from "./factories.js";

export async function loginAs(request: SuperTest<Test>, user: TestUser): Promise<string[]> {
  const response = await request
    .post("/api/auth/login")
    .send({ email: user.email, password: TEST_PASSWORD })
    .expect(200);

  const cookies = response.headers["set-cookie"];
  if (!cookies || cookies.length === 0) {
    throw new Error(`Login failed for ${user.email}`);
  }

  return Array.isArray(cookies) ? cookies : [cookies];
}

export function authenticatedRequest(request: SuperTest<Test>, cookies: string[]) {
  return {
    get: (url: string) => applyCookies(request.get(url), cookies),
    post: (url: string) => applyCookies(request.post(url), cookies),
    put: (url: string) => applyCookies(request.put(url), cookies),
    patch: (url: string) => applyCookies(request.patch(url), cookies),
    delete: (url: string) => applyCookies(request.delete(url), cookies),
  };
}

function applyCookies<T extends { set: (field: string, value: string) => T }>(
  req: T,
  cookies: string[],
): T {
  return cookies.reduce((current, cookie) => current.set("Cookie", cookie), req);
}
