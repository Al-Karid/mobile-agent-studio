/// <reference types="expo/types" />

// CSS imports (global.css, *.module.css) are handled by Metro/Babel at runtime;
// declare them so a bare `tsc --noEmit` type-check stays clean.
declare module "*.css";
declare module "*.module.css";
