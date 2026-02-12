/// <reference types="vite/client" />

// Declare module for CSS imports with ?raw suffix
declare module '*.css?raw' {
  const content: string;
  export default content;
}
