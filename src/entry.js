#!/usr/bin/env node

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(__dirname, "esm-loader.js")).href);

import("./cli.js");
