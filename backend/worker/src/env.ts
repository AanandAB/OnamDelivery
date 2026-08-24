// Worker bindings & environment.
export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  // IMAGES?: R2Bucket; // enable after R2 is activated on the account
}
