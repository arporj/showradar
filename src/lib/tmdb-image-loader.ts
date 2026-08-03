"use client";

import type { ImageLoader } from "next/image";

// TMDb pre-renders posters/backdrops/stills/profiles at these fixed widths on
// its own CDN (see tmdbImageUrl in ./tmdb.ts). Handing next/image a loader
// that maps straight back onto that ladder means the browser fetches the
// already-correctly-sized TMDb file directly — Vercel's Image Optimization
// pipeline (and its transformation quota) never gets involved.
const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280];

const TMDB_URL_RE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)[^/]+(\/.+)$/;

export const tmdbImageLoader: ImageLoader = ({ src, width }) => {
  const match = TMDB_URL_RE.exec(src);
  if (!match) return src;

  const [, base, path] = match;
  const bucket = TMDB_WIDTHS.find((w) => w >= width);
  const size = bucket ? `w${bucket}` : "original";
  return `${base}${size}${path}`;
};
