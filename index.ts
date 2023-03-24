import { Provider } from "@auth/core/providers";
import GithubProvider from "@auth/core/providers/github";
import { Profile } from "@auth/core/types";
import cookies, { FastifyCookieOptions } from "@fastify/cookie";
import cors from "@fastify/cors";
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import {
  CreateFastifyContextOptions,
  fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import fastify, { FastifyRequest } from "fastify";
import AuthPlugin from "fastify-next-auth";

const prisma = () => {};

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // I'm trying to create a TRPC Context using Fastify, prisma, @auth/js; it doesn't seem to be
  // as straightforward as with Next.js - HELP PLS
  return {
    req,
    res,
    session: null,
    prisma,
  } as {
    req: FastifyRequest;
    res: unknown;
    session: {
      expires: string;
      user: {
        id: string;
        name: string;
        email: string;
        image: string;
      };
    } | null;
    prisma: typeof prisma;
  };
}

const t = initTRPC.create();

// Example of a TRPC router
const appRouter = initTRPC.create().router({
  hi: t.procedure.query(() => {
    return "hi";
  }),
});

export type Context = inferAsyncReturnType<typeof createContext>;

const server = fastify({
  maxParamLength: 5000,
});

server.register(AuthPlugin, {
  secret: process.env.AUTH_SECRET as string,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }) as Provider<Profile>,
  ],
});

server.register(cors, {
  origin: ["http://localhost:3000", "my.company.dev"],
  methods: ["GET", "POST", "PUT", "DELETE"],
});

server.register(cookies, {
  secret: "abc",
} as FastifyCookieOptions);

server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});

process.on("unhandledRejection", (e) => {
  server.log.error(e);
  process.exit(1);
});

(async () => {
  try {
    await server.listen({ port: 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
