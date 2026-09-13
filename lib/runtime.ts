declare const __STRIDE_PAGES__: boolean;
declare const __STRIDE_SELF_HOSTED__: boolean;
export const isPages = typeof __STRIDE_PAGES__ !== 'undefined' && __STRIDE_PAGES__;
export const isSelfHosted =
  typeof __STRIDE_SELF_HOSTED__ !== 'undefined' && __STRIDE_SELF_HOSTED__;
export const usesServerState = isSelfHosted;
export const assetUrl = (path: string) => isPages ? '/stride-gear' + path : path;
