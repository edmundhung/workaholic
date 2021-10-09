#!/usr/bin/env node
import { Command } from 'commander';
import { makeGenerateCommand } from './commands/generate';
import { makePreviewCommand } from './commands/preview';
import { makePublishCommand } from './commands/publish';

const program = new Command();

program
  .addCommand(makeGenerateCommand())
  .addCommand(makePreviewCommand())
  .addCommand(makePublishCommand())
;

program.parse();
