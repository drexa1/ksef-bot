import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    base: "./",
    root: "src",
    publicDir: "public",
    build: {
        outDir: "dist",
        emptyOutDir: true
    },
    resolve: {
        alias: {
            "@wasm": path.resolve(__dirname, "./wasm"),
        }
    }
});