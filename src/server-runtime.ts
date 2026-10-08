// Keep the direct Docker/start commands coupled to these server-only arguments.
// No old-space override or global NODE_OPTIONS: the resource generator stays unflagged.
export const SERVER_NODE_ARGS = Object.freeze(["--max-semi-space-size=16"] as const);
