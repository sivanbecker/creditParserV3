import { Command } from 'commander';
import { createCliProgram } from '../cli/cli.js';

describe('CLI entrypoint', () => {
  it('creates a Commander program instance', () => {
    const program = createCliProgram();

    expect(program).toBeInstanceOf(Command);
    expect(typeof program.parse).toBe('function');
    expect(typeof program.command).toBe('function');
  });

  it('sets a non-empty name and description', () => {
    const program = createCliProgram();

    expect(program.name()).toBeTruthy();
    expect(program.description()).toBeTruthy();
    expect(typeof program.helpInformation).toBe('function');
  });
});
