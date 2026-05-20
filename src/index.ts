import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { loadConfig, loadMyNames } from './config.js';
import { processAll } from './stages/process.js';
import { chunkAll } from './stages/chunk.js';
import { runOllamaPipeline } from './stages/extract.js';
import { runInterview } from './stages/interview.js';

function hasFreeformFiles(dir: string): boolean {
  const abs = path.resolve(dir);
  if (!existsSync(abs)) return false;
  try {
    return readdirSync(abs).some((n) => /\.(txt|md)$/i.test(n));
  } catch {
    return false;
  }
}

function parseFlags(argv: string[]): { ollama: boolean; interview: boolean; englishPrimary: boolean } {
  return {
    ollama: argv.includes('--ollama'),
    interview: argv.includes('--interview'),
    englishPrimary: argv.includes('--en'),
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const cfg = loadConfig();

  if (flags.interview) {
    await runInterview(cfg, { englishPrimary: flags.englishPrimary });
    return;
  }

  // Only require my-names.txt if there are actual freeform inputs to filter.
  // Questionnaire-only runs don't need it.
  const myNames = hasFreeformFiles(cfg.inputsFreeformDir)
    ? new Set(loadMyNames(cfg.myNamesFile))
    : new Set<string>();

  const filterDesc = myNames.size > 0
    ? `filtering to ${chalk.yellow(myNames.size)} name(s) of mine`
    : chalk.dim('no freeform inputs — questionnaire-only mode');
  console.log(chalk.cyan.bold('[1/2]') + ` Processing inputs (${filterDesc})...`);
  const stats = processAll(cfg, myNames);
  const qPart =
    stats.questionnaireAnswers > 0
      ? `  questionnaire=${chalk.green(stats.questionnaireAnswers)}`
      : '';
  console.log(
    `      files=${chalk.yellow(stats.filesProcessed)}  ` +
      `raw-lines=${chalk.yellow(stats.totalLinesIn)}  ` +
      `mine=${chalk.yellow(stats.myLinesIn)}  ` +
      `kept=${chalk.green(stats.linesOut)}  ` +
      `dup-dropped=${chalk.dim(stats.duplicatesDropped)}` +
      qPart,
  );

  console.log(
    chalk.cyan.bold('[2/2]') +
      ` Chunking (target ${chalk.yellow(cfg.chunkTargetTokens)} tokens/chunk)...`,
  );
  const manifest = chunkAll(cfg);
  console.log(
    `      chunks=${chalk.green(manifest.chunks.length)}  ` +
      `total-tokens=${chalk.yellow(manifest.totalEstimatedTokens)}  ` +
      `→ ${chalk.cyan(cfg.chunksDir + '/')}`,
  );

  if (!flags.ollama) {
    console.log('');
    console.log(chalk.green.bold('Done.') + ' In a Claude Code session on this repo, run:');
    console.log(`  ${chalk.bold.cyan('/extract-soul')}`);
    console.log(
      chalk.dim(
        `(skill at ${chalk.cyan('.claude/skills/extract-soul/SKILL.md')} — fans out one sub-agent per chunk, synthesizes ${chalk.cyan('out/my-soul.md')})`,
      ),
    );
    console.log('');
    console.log(chalk.dim(`Or run with ${chalk.bold('--ollama')} to use the local fallback path.`));
    return;
  }

  console.log(chalk.magenta.bold('[ollama]') + ' Running map + reduce against local Ollama...');
  const outPath = await runOllamaPipeline(cfg, manifest);
  console.log(chalk.green.bold('Done.') + ' Soul written to ' + chalk.cyan(outPath));
}

main().catch((err) => {
  console.error(chalk.red.bold('error: ') + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
