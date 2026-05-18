import chalk from 'chalk';
import { loadConfig, loadMyNames } from './config.js';
import { processAll } from './stages/process.js';
import { chunkAll } from './stages/chunk.js';
import { runOllamaPipeline } from './stages/extract.js';

function parseFlags(argv: string[]): { ollama: boolean } {
  return { ollama: argv.includes('--ollama') };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const cfg = loadConfig();
  const myNames = new Set(loadMyNames(cfg.myNamesFile));

  console.log(
    chalk.cyan.bold('[1/2]') +
      ` Processing freeform inputs (filtering to ${chalk.yellow(myNames.size)} name(s) of mine)...`,
  );
  const stats = processAll(cfg, myNames);
  console.log(
    `      files=${chalk.yellow(stats.filesProcessed)}  ` +
      `raw-lines=${chalk.yellow(stats.totalLinesIn)}  ` +
      `mine=${chalk.yellow(stats.myLinesIn)}  ` +
      `kept=${chalk.green(stats.linesOut)}  ` +
      `dup-dropped=${chalk.dim(stats.duplicatesDropped)}`,
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
