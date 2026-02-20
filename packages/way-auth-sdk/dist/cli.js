#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildConsumerConfig, buildEnvFile, buildNextAuthFile, buildNextEnvUpdates, buildNextMiddlewareFile, buildNextSetupGuide, buildSetupGuide, mergeEnvFile, normalizePublicPaths, } from "./cli-utils";
const DEFAULT_BASE_URL = "https://way-my-auth-service.vercel.app";
const DEFAULT_AUTH_FILE_PATH = "src/lib/auth.ts";
const DEFAULT_MIDDLEWARE_PATH = "middleware.ts";
function parseArgs(argv) {
    const options = {
        mergeEnv: true,
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--help" || arg === "-h") {
            options.help = true;
            continue;
        }
        if (arg === "--overwrite") {
            options.overwrite = true;
            continue;
        }
        if (arg === "--yes") {
            options.yes = true;
            continue;
        }
        if (arg === "--minimal") {
            options.minimal = true;
            continue;
        }
        if (arg === "--merge-env") {
            options.mergeEnv = true;
            continue;
        }
        if (arg === "--no-merge-env") {
            options.mergeEnv = false;
            continue;
        }
        const nextValue = argv[index + 1];
        if (!nextValue || nextValue.startsWith("--")) {
            continue;
        }
        switch (arg) {
            case "--framework":
                if (nextValue === "next" || nextValue === "generic") {
                    options.framework = nextValue;
                }
                index += 1;
                break;
            case "--base-url":
                options.baseUrl = nextValue;
                index += 1;
                break;
            case "--issuer":
                options.issuer = nextValue;
                index += 1;
                break;
            case "--audience":
                options.audience = nextValue;
                index += 1;
                break;
            case "--jwks-url":
                options.jwksUrl = nextValue;
                index += 1;
                break;
            case "--env-path":
                options.envPath = nextValue;
                index += 1;
                break;
            case "--guide-path":
                options.guidePath = nextValue;
                index += 1;
                break;
            case "--auth-file":
                options.authFilePath = nextValue;
                index += 1;
                break;
            case "--middleware-path":
                options.middlewarePath = nextValue;
                index += 1;
                break;
            case "--admin-prefix":
                options.adminPrefix = nextValue;
                index += 1;
                break;
            case "--public-paths":
                options.publicPaths = nextValue;
                index += 1;
                break;
            default:
                break;
        }
    }
    return options;
}
function printUsage() {
    const message = [
        "",
        "way-auth-setup",
        "",
        "Usage:",
        "  way-auth-setup [options]",
        "",
        "Options:",
        "  --framework next|generic   (default: next)",
        "  --minimal                  (default: true for next)",
        "  --merge-env                merge env updates (default: true)",
        "  --no-merge-env             write env file directly",
        `  --base-url                 (default: ${DEFAULT_BASE_URL})`,
        "  --issuer                   issuer override (generic mode)",
        "  --audience                 audience override (generic mode)",
        "  --jwks-url                 jwks override (generic mode)",
        "  --env-path                 (default: .env.local)",
        "  --guide-path               (default: way-auth-setup-guide.md)",
        "  --auth-file                (default: src/lib/auth.ts for next)",
        "  --middleware-path          (default: middleware.ts for next)",
        "  --admin-prefix             middleware admin prefix (next mode)",
        "  --public-paths             comma-separated public admin paths",
        "  --overwrite                overwrite existing non-generated content",
        "  --yes                      non-interactive overwrite alias",
        "  --help                     show this message",
        "",
    ].join("\n");
    console.log(message);
}
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function readFileIfExists(filePath) {
    try {
        return await fs.readFile(filePath, "utf8");
    }
    catch {
        return null;
    }
}
async function ensureParentDirectory(filePath) {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
}
async function writeManagedFile(filePath, content, overwrite) {
    const existing = await readFileIfExists(filePath);
    if (existing === null) {
        await ensureParentDirectory(filePath);
        await fs.writeFile(filePath, content, "utf8");
        return "created";
    }
    if (existing === content) {
        return "unchanged";
    }
    if (!overwrite) {
        throw new Error(`File ${filePath} already exists with different content. Re-run with --overwrite.`);
    }
    await fs.writeFile(filePath, content, "utf8");
    return "updated";
}
async function runNextSetup(options) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const envPath = options.envPath ?? ".env.local";
    const guidePath = options.guidePath ?? "way-auth-setup-guide.md";
    const authFilePath = options.authFilePath ?? DEFAULT_AUTH_FILE_PATH;
    const middlewarePath = options.middlewarePath ?? DEFAULT_MIDDLEWARE_PATH;
    const overwrite = Boolean(options.overwrite || options.yes);
    const mergeEnv = options.mergeEnv ?? true;
    const publicPaths = normalizePublicPaths(options.publicPaths);
    const authFile = buildNextAuthFile({
        adminPrefix: options.adminPrefix,
        publicPaths,
    });
    const middlewareFile = buildNextMiddlewareFile();
    const guideFile = buildNextSetupGuide({
        baseUrl,
        envPath,
        authFilePath,
        middlewarePath,
    });
    const authAbsolute = path.resolve(process.cwd(), authFilePath);
    const middlewareAbsolute = path.resolve(process.cwd(), middlewarePath);
    const guideAbsolute = path.resolve(process.cwd(), guidePath);
    const envAbsolute = path.resolve(process.cwd(), envPath);
    const authStatus = await writeManagedFile(authAbsolute, authFile, overwrite);
    const middlewareStatus = await writeManagedFile(middlewareAbsolute, middlewareFile, overwrite);
    const guideStatus = await writeManagedFile(guideAbsolute, guideFile, overwrite);
    const envUpdates = buildNextEnvUpdates(baseUrl);
    const existingEnv = (await readFileIfExists(envAbsolute)) ?? "";
    const envContent = mergeEnv ? mergeEnvFile(existingEnv, envUpdates) : mergeEnvFile("", envUpdates);
    if (!mergeEnv && (await fileExists(envAbsolute)) && !overwrite) {
        const existing = await fs.readFile(envAbsolute, "utf8");
        if (existing !== envContent) {
            throw new Error(`File ${envPath} already exists with different content. Re-run with --overwrite.`);
        }
    }
    await ensureParentDirectory(envAbsolute);
    await fs.writeFile(envAbsolute, envContent, "utf8");
    console.log([
        "Next.js setup complete.",
        `- ${authFilePath}: ${authStatus}`,
        `- ${middlewarePath}: ${middlewareStatus}`,
        `- ${guidePath}: ${guideStatus}`,
        `- ${envPath}: merged`,
    ].join("\n"));
}
async function runGenericSetup(options) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const envPath = options.envPath ?? ".env.local";
    const guidePath = options.guidePath ?? "way-auth-setup-guide.md";
    const overwrite = Boolean(options.overwrite || options.yes);
    const config = buildConsumerConfig({
        baseUrl,
        issuer: options.issuer,
        audience: options.audience,
        jwksUrl: options.jwksUrl,
    });
    const envAbsolute = path.resolve(process.cwd(), envPath);
    const guideAbsolute = path.resolve(process.cwd(), guidePath);
    if (!overwrite) {
        const [envExists, guideExists] = await Promise.all([fileExists(envAbsolute), fileExists(guideAbsolute)]);
        if (envExists || guideExists) {
            throw new Error("One or more output files already exist. Use --overwrite to replace them.");
        }
    }
    await ensureParentDirectory(envAbsolute);
    await ensureParentDirectory(guideAbsolute);
    await fs.writeFile(envAbsolute, buildEnvFile(config), "utf8");
    await fs.writeFile(guideAbsolute, buildSetupGuide(config), "utf8");
    console.log(`Generated ${envPath} and ${guidePath}.`);
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printUsage();
        process.exit(0);
    }
    const framework = options.framework ?? "next";
    if (framework === "next") {
        await runNextSetup({
            ...options,
            minimal: options.minimal ?? true,
        });
        return;
    }
    await runGenericSetup(options);
}
void main().catch((error) => {
    const message = error instanceof Error ? error.message : "Setup failed.";
    console.error(message);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map