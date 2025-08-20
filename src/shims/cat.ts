/**
 * Shim global pour éviter ReferenceError: cat is not defined
 * S'il est appelé comme fonction, on no-op proprement.
 */
declare global {
  var cat: any; // évite les erreurs TS si d’autres fichiers l’utilisent
}
;(globalThis as any).cat = (globalThis as any).cat ?? ((..._args: any[]) => {});
export {};
