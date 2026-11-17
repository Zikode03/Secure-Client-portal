import type { paths } from "./generated/portal-api";

type Method = "get" | "post" | "put" | "patch" | "delete";
type ExpandPath<P extends string> = P extends `${infer A}{${string}}${infer B}` ? `${A}${string}${ExpandPath<B>}` : P;
type Routes<M extends Method> = { [P in keyof paths]: M extends keyof paths[P] ? NonNullable<paths[P][M]> extends never ? never : ExpandPath<Lowercase<P>> : never }[keyof paths];
export type ApiRoute<M extends Method> = Routes<M> | `${Routes<M>}?${string}`;
type StripQuery<P extends string> = P extends `${infer Base}?${string}` ? Base : P;
type MatchSegments<A extends string, P extends string> = P extends `${infer H}/${infer T}`
  ? A extends `${infer AH}/${infer AT}` ? H extends `{${string}}` ? MatchSegments<AT, T> : Lowercase<AH> extends Lowercase<H> ? MatchSegments<AT, T> : false : false
  : P extends `{${string}}` ? A extends `${string}/${string}` ? false : true : Lowercase<A> extends Lowercase<P> ? true : false;
type SegmentMatches<P extends string, M extends Method> = { [K in keyof paths]: MatchSegments<StripQuery<P>, K> extends true ? M extends keyof paths[K] ? NonNullable<paths[K][M]> extends never ? never : K : never : never }[keyof paths];
type Matches<P extends string, M extends Method> = P extends unknown ? Lowercase<StripQuery<P>> extends Lowercase<keyof paths>
 ? { [K in keyof paths]: Lowercase<K> extends Lowercase<StripQuery<P>> ? M extends keyof paths[K] ? NonNullable<paths[K][M]> extends never ? never : K : never : never }[keyof paths]
 : SegmentMatches<P, M> : never;
type Operation<P extends string, M extends Method> = { [K in Matches<P, M>]: M extends keyof paths[K] ? NonNullable<paths[K][M]> : never }[Matches<P, M>];
type JsonContent<T> = T extends { content: infer C } ? C extends { "application/json": infer J } ? J : C[keyof C] : void;
type Success<T> = T extends { responses: infer R } ? { [S in keyof R]: `${S & (string | number)}` extends `2${string}` ? JsonContent<R[S]> : never }[keyof R] : never;
export type ApiResponse<P extends string, M extends Method = "get"> = Success<Operation<P, M>>;
export type ApiBody<P extends string, M extends Method> = Operation<P, M> extends { requestBody?: infer B } ? [NonNullable<B>] extends [never] ? Record<string, never> : JsonContent<NonNullable<B>> : Record<string, never>;

type DownloadRoutes = { [K in keyof paths]: "get" extends keyof paths[K]
 ? Extract<Success<NonNullable<paths[K]["get"]>>, Blob> extends never ? never : ExpandPath<Lowercase<K>> : never }[keyof paths];
export type ApiDownloadRoute = DownloadRoutes | `${DownloadRoutes}?${string}`;

/** Match whole path segments, so an id wildcard cannot consume extra route segments. */
export type ApiPath<P extends string, M extends Method> = [Matches<P, M>] extends [never] ? never : P;
