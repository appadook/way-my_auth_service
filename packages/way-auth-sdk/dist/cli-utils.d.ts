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
export declare function normalizeBaseUrl(value: string): string;
export declare function buildConsumerConfig(input: ConsumerConfigInput): ConsumerConfig;
export declare function buildEnvFile(config: ConsumerConfig): string;
export declare function buildSetupGuide(config: ConsumerConfig): string;
//# sourceMappingURL=cli-utils.d.ts.map