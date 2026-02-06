#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildConsumerConfig, buildEnvFile, buildSetupGuide } from "./cli-utils";

type CliOptions = {
  baseUrl?: string;
  issuer?: string;
  audience?: string;
  jwksUrl?: string;
  envPath?: string;
  guidePath?: string;
  overwrite?: boolean;
  help?: boolean;
};

const DEFAULT_BASE_URL = "https://way-my-auth-service.vercel.app";

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
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

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      continue;
    }

    switch (arg) {
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
    `  --base-url    (default: ${DEFAULT_BASE_URL}) auth service base URL`,
    "  --issuer      (default: base URL)",
    "  --audience    (default: way-clients)",
    "  --jwks-url    (default: base URL + /api/v1/jwks)",
    "  --env-path    (default: .env.local)",
    "  --guide-path  (default: way-auth-setup-guide.md)",
    "  --overwrite   overwrite existing files",
    "  --help        show this message",
    "",
  ].join("\n");
  console.log(message);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!options.baseUrl) {
    options.baseUrl = DEFAULT_BASE_URL;
  }

  const config = buildConsumerConfig({
    baseUrl: options.baseUrl,
    issuer: options.issuer,
    audience: options.audience,
    jwksUrl: options.jwksUrl,
  });

  const envPath = options.envPath ?? ".env.local";
  const guidePath = options.guidePath ?? "way-auth-setup-guide.md";

  const envAbsolute = path.resolve(process.cwd(), envPath);
  const guideAbsolute = path.resolve(process.cwd(), guidePath);

  if (!options.overwrite) {
    const [envExists, guideExists] = await Promise.all([
      fileExists(envAbsolute),
      fileExists(guideAbsolute),
    ]);
    if (envExists || guideExists) {
      console.error("One or more output files already exist. Use --overwrite to replace them.");
      process.exit(1);
    }
  }

  await fs.writeFile(envAbsolute, buildEnvFile(config), "utf8");
  await fs.writeFile(guideAbsolute, buildSetupGuide(config), "utf8");

  console.log(`Generated ${envPath} and ${guidePath}.`);
}

void main();
