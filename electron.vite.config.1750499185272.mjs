// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
var __electron_vite_injected_dirname = "D:\\CodeLab\\WoaApp";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: "cjs"
          // Force CommonJS format for main process
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/preload/index.ts"),
          bubblePreload: resolve(__electron_vite_injected_dirname, "src/preload/bubblePreload.ts")
        },
        output: {
          format: "cjs"
          // Force CommonJS format for preload
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [vue()],
    server: {
      port: 5174
      // strictPort: true,
      // hmr: {
      //   overlay: false
      // }
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/renderer/index.html"),
          bubble: resolve(__electron_vite_injected_dirname, "src/renderer/bubble.html")
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
