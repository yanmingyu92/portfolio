#!/usr/bin/env node
/** Thin wrapper: site-root entry for the video pipeline uploader (impl in tools/video). */
import('../tools/video/upload-video.mjs').catch((e) => {
  console.error(e);
  process.exit(1);
});
