// @ts-nocheck
import { fromConfig } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = fromConfig<typeof Config>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), }),
};
export default browserCollections;