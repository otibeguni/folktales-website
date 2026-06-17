import { mutateStoryRelations, StoryRelationEditorError } from "./story-relation-editor.mjs";

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      resolve(body);
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(payload)}\n`);
}

function getRelationType(pathname) {
  if (pathname === "/__local-content/story-relations/topic") {
    return "topic";
  }

  if (pathname === "/__local-content/story-relations/resource") {
    return "resource";
  }

  return null;
}

export function createStoryRelationDevPlugin({ rootDir = process.cwd() } = {}) {
  return {
    name: "story-relation-dev-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url ? new URL(req.url, "http://localhost") : null;
        const relationType = requestUrl ? getRelationType(requestUrl.pathname) : null;

        if (!relationType) {
          next();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "Method not allowed" });
          return;
        }

        try {
          const rawBody = await readRequestBody(req);
          const payload = rawBody ? JSON.parse(rawBody) : {};
          const result = await mutateStoryRelations({
            rootDir,
            isDev: true,
            relationType,
            payload,
          });

          sendJson(res, 200, {
            ok: true,
            result,
          });
        } catch (error) {
          if (error instanceof SyntaxError) {
            sendJson(res, 400, { ok: false, error: "Invalid JSON payload" });
            return;
          }

          if (error instanceof StoryRelationEditorError) {
            sendJson(res, error.status || 400, { ok: false, error: error.message });
            return;
          }

          sendJson(res, 500, {
            ok: false,
            error: error instanceof Error ? error.message : "Unexpected error",
          });
        }
      });
    },
  };
}
