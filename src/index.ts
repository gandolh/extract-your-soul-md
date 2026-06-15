import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { color } from './color.js';
import { loadConfig, loadMyNames } from './config.js';
import { processAll } from './stages/process.js';
import { chunkAll } from './stages/chunk.js';
import { runOllamaPipeline } from './stages/extract.js';
import { runInterview } from './stages/interview.js';
import { runServe } from './server/serve.js';

function hasFreeformFiles(dir: string): boolean {
  const abs = path.resolve(dir);
  if (!existsSync(abs)) return false;
  try {
    return readdirSync(abs).some((n) => /\.(txt|md)$/i.test(n));
  } catch {
    return false;
  }
}

interface Flags {
  ollama: boolean;
  interview: boolean;
  serve: boolean;
  englishPrimary: boolean;
  port: number;
}

function parseFlags(argv: string[]): Flags {
  const portFlag = argv.find((a) => a.startsWith('--port='));
  const parsedPort = portFlag ? Number(portFlag.slice('--port='.length)) : NaN;
  return {
    ollama: argv.includes('--ollama'),
    interview: argv.includes('--interview'),
    // --serve runs the web platform (Fastify API + SPA). --web is kept as an
    // alias so old muscle memory still works.
    serve: argv.includes('--serve') || argv.includes('--web'),
    englishPrimary: argv.includes('--en'),
    port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4317,
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const cfg = loadConfig();

  if (flags.interview) {
    await runInterview(cfg, { englishPrimary: flags.englishPrimary });
    return;
  }

  if (flags.serve) {
    await runServe(cfg, { port: flags.port || cfg.serverPort, host: 'localhost' });
    return;
  }

  // Only require my-names.txt if there are actual freeform inputs to filter.
  // Questionnaire-only runs don't need it.
  const myNames = hasFreeformFiles(cfg.inputsFreeformDir)
    ? new Set(loadMyNames(cfg.myNamesFile))
    : new Set<string>();

  const filterDesc = myNames.size > 0
    ? `filtering to ${color.yellow(myNames.size)} name(s) of mine`
    : color.dim('no freeform inputs — questionnaire-only mode');
  console.log(color.cyan.bold('[1/2]') + ` Processing inputs (${filterDesc})...`);
  const stats = processAll(cfg, myNames);
  const qPart =
    stats.questionnaireAnswers > 0
      ? `  questionnaire=${color.green(stats.questionnaireAnswers)}`
      : '';
  console.log(
    `      files=${color.yellow(stats.filesProcessed)}  ` +
      `raw-lines=${color.yellow(stats.totalLinesIn)}  ` +
      `mine=${color.yellow(stats.myLinesIn)}  ` +
      `kept=${color.green(stats.linesOut)}  ` +
      `dup-dropped=${color.dim(stats.duplicatesDropped)}` +
      qPart,
  );

  console.log(
    color.cyan.bold('[2/2]') +
      ` Chunking (target ${color.yellow(cfg.chunkTargetTokens)} tokens/chunk)...`,
  );
  const manifest = chunkAll(cfg);
  console.log(
    `      chunks=${color.green(manifest.chunks.length)}  ` +
      `total-tokens=${color.yellow(manifest.totalEstimatedTokens)}  ` +
      `→ ${color.cyan(cfg.chunksDir + '/')}`,
  );

  if (!flags.ollama) {
    console.log('');
    console.log(color.green.bold('Done.') + ' In a Claude Code session on this repo, run:');
    console.log(`  ${color.bold.cyan('/extract-soul')}`);
    console.log(
      color.dim(
        `(skill at ${color.cyan('.claude/skills/extract-soul/SKILL.md')} — fans out one sub-agent per chunk, synthesizes ${color.cyan('out/my-soul.md')})`,
      ),
    );
    console.log('');
    console.log(color.dim(`Or run with ${color.bold('--ollama')} to use the local fallback path.`));
    return;
  }

  console.log(color.magenta.bold('[ollama]') + ' Running map + reduce against local Ollama...');
  const outPath = await runOllamaPipeline(cfg, manifest);
  console.log(color.green.bold('Done.') + ' Soul written to ' + color.cyan(outPath));
}

main().catch((err) => {
  console.error(color.red.bold('error: ') + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
