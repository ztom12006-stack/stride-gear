declare const __STRIDE_PAGES__: boolean;
export const isPages = typeof __STRIDE_PAGES__ !== 'undefined' && __STRIDE_PAGES__;
export const assetUrl = (path: string) => isPages ? '/stride-gear' + path : path;
