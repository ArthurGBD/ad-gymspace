import { createApp } from "./app/app.js";
import { createLogger, LEVELS } from "./services/logger.js";
import { createStore } from "./storage/store.js";

const debug =
  !__PROD__ || new URLSearchParams(location.search).get("debug") === "1";
let storage;
try {
  storage = window.localStorage;
  storage.getItem("adgymspace.probe");
} catch {
  const mem = new Map();
  storage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}
const logger = createLogger({
  level: debug ? LEVELS.DEBUG : LEVELS.INFO,
  persist: storage,
  sink: debug ? (e) => console.debug("[adgs]", e) : null,
});
window.addEventListener("error", (e) =>
  logger.error("window.error", {
    code: "AD-UNX-001",
    where: String(e.filename ?? "")
      .split("/")
      .pop(),
  }),
);
window.addEventListener("unhandledrejection", () =>
  logger.error("window.unhandledrejection", { code: "AD-UNX-001" }),
);
const store = createStore({ storage, logger });
const app = createApp({
  root: document.getElementById("app"),
  store,
  logger,
}).init();
if (debug) /** @type {any} */ (window).__adgs = app;
