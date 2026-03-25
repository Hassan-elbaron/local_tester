import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Local dev bypass user — only active when OAuth is not configured
const DEV_USER: User = {
  id: 1,
  openId: "dev-local",
  name: "Local Dev",
  email: "dev@local",
  loginMethod: null,
  role: "admin",
  preferredLanguage: "en",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as unknown as User;

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // If OAuth is not configured, auto-authenticate as dev user
  if (!ENV.oAuthServerUrl) {
    return { req: opts.req, res: opts.res, user: DEV_USER };
  }

  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  return { req: opts.req, res: opts.res, user };
}
