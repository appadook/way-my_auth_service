export type ConsumerConfigInput = {
    baseUrl: string;
    issuer?: string;
    audience?: string;
    jwksUrl?: string;
};
export type ConsumerConfig = {
    baseUrl: string;
    issuer: string;
    audience: string;
    jwksUrl: string;
};
export type NextSetupOptions = {
    adminPrefix?: string;
    publicPaths?: string[];
    transportMode?: "direct" | "proxy";
};
export declare function normalizePublicPaths(value: string | undefined): string[] | undefined;
export declare function normalizeBaseUrl(value: string): string;
export declare function buildConsumerConfig(input: ConsumerConfigInput): ConsumerConfig;
export declare function buildEnvFile(config: ConsumerConfig): string;
export declare function mergeEnvFile(existingContent: string, updates: Record<string, string>): string;
export declare function buildNextAuthFile(options?: NextSetupOptions): string;
export declare function buildNextMiddlewareFile(): string;
export declare function buildNextEnvUpdates(baseUrl: string): Record<string, string>;
export type WayAuthNextRewrite = {
    source: string;
    destination: string;
};
export type NextConfigPatchResult = {
    status: "updated" | "unchanged";
    content: string;
    snippet: string;
} | {
    status: "unsupported";
    content: string;
    snippet: string;
    reason: string;
};
export declare function buildNextProxyRewrites(baseUrl: string): WayAuthNextRewrite[];
export declare function buildNextRewritesSnippet(baseUrl: string): string;
export declare function patchNextConfigWithProxyRewrites(existingContent: string, baseUrl: string): NextConfigPatchResult;
export declare function buildSetupGuide(config: ConsumerConfig): string;
export declare function buildNextSetupGuide(input: {
    baseUrl: string;
    envPath: string;
    authFilePath: string;
    middlewarePath: string;
    transportMode: "direct" | "proxy";
}): string;
//# sourceMappingURL=cli-utils.d.ts.map