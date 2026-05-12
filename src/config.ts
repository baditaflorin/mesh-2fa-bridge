import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-2fa-bridge",
  description:
    "Type a 2FA code on your phone, copy it on your laptop in one click — your devices only",
  accentHex: "#ffb74a",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
