// @ts-nocheck
import * as __fd_glob_0 from "../content/docs/index.mdx?collection=docs"
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = fromConfig<typeof Config>();

export const docs = await create.docs("docs", "content/docs", {}, {"index.mdx": __fd_glob_0, });