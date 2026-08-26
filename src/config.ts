import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-2fa-bridge",
  breadcrumbs: false,
  displayName: "Code Relay",
  visualProfile: "utility",
  shellLayout: "inset",
  description: "A short-lived one-time-code handoff for people already in the same shared room.",
  accentHex: "#89b7ff",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
