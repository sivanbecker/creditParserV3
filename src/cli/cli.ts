import { Command } from 'commander';

export const createCliProgram = (): Command => {
  const program = new Command();

  program.name('credit-parser');
  program.description('Credit card expense tracker CLI');

  return program;
};
