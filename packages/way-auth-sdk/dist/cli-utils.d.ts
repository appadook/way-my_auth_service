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
};
export declare function normalizePublicPaths(value: string | undefined): string[] | undefined;
export declare function normalizeBaseUrl(value: string): string;
export declare function buildConsumerConfig(input: ConsumerConfigInput): ConsumerConfig;
export declare function buildEnvFile(config: ConsumerConfig): string;
export declare function mergeEnvFile(existingContent: string, updates: Record<string, string>): string;
export declare function buildNextAuthFile(options?: NextSetupOptions): string;
export declare function buildNextMiddlewareFile(): string;
export declare function buildNextEnvUpdates(baseUrl: string): Record<string, string>;
export declare function buildSetupGuide(config: ConsumerConfig): string;
export declare function buildNextSetupGuide(input: {
    baseUrl: string;
    envPath: string;
    authFilePath: string;
    middlewarePath: string;
}): string;
//# sourceMappingURL=cli-utils.d.ts.map