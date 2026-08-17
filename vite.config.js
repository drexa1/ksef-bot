import {defineConfig} from "vite";
import {globSync} from "glob";
import path from "path";

const pages = Object.fromEntries(
    globSync("**/*.html", {
        ignore: [
            "node_modules/**",
            "dist/**",
            "public/**",
        ],
    }).map((file) => [
        file.replace(/\.html$/, ""),
        path.resolve(__dirname, file),
    ])
);

export default defineConfig({
    base: "./",
    publicDir: "public",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: pages
        },
    },
    resolve: {
        alias: {
            "@wasm": path.resolve(__dirname, "./src/wasm"),
        }
    }
});
