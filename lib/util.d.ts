/** Doing the same thing as `array.map()` but then, it removes all `undefined` values */
export declare const mapAndFilter: <T, K>(array: T[], fn: (value: T, index: number, array: T[]) => K) => Exclude<K, undefined>[];
/** Shortcut for `Object.fromEntries(array.map(o => [o.keyProp, o.valueProp]))` */
