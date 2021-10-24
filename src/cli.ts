#!/usr/bin/env node
import { Command } from 'commander';
import { makeBuildCommand } from './commands/build';
import { makeGenerateCommand } from './commands/generate';
import { makePreviewCommand } from './commands/preview';
import { makePublishCommand } from './commands/publish';

const program = new Command();

program
  .addCommand(makeBuildCommand())
  .addCommand(makeGenerateCommand())
  .addCommand(makePreviewCommand())
  .addCommand(makePublishCommand())
;

program.parse();
