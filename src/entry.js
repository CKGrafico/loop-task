#!/usr/bin/env node

if (process.env.NODE_ENV === undefined) {
  process.env.NODE_ENV = "production";
  process.env.LOOP_TASK_DEFAULTED_NODE_ENV = "1";
}

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(__dirname, "esm-loader.js")).href);

import("./cli.js");
