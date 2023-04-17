import { XMLParser } from 'fast-xml-parser';
import { readFile, writeFile } from 'fs/promises';

const info = 'echo Script generated by Flashfile2sh\n';

interface Step {
  '@_operation': string;
  '@_var'?: string;
  '@_MD5'?: string;
  '@_filename'?: string;
  '@_partition'?: string;
  '@_SHA1'?: string;
}

export default async function generate(input: string, output: string) {
  try {
    const data = await readFile(input);

    const parser = new XMLParser({ ignoreAttributes: false });

    const commandsToBeWritten: string[] = [];
    const md5sums: Record<string, string> = {};
    const sha1sums: Record<string, string> = {};

    const { flashing } = parser.parse(data);
    const steps: Step[] = flashing.steps.step;

    let checksumString: string | null = null;

    steps.forEach((step) => {
      switch (true) {
        case Boolean(step['@_MD5'] && step['@_filename']):
          md5sums[step['@_filename'] as string] = step['@_MD5'] as string;
          break;
        case Boolean(step['@_SHA1'] && step['@_filename']):
          sha1sums[step['@_filename'] as string] = step['@_SHA1'] as string;
          break;
        default:
          break;
      }

      const operation = step['@_operation'];
      let variables: string[] = [];

      switch (operation) {
        case 'flash':
          variables = ['@_operation', '@_partition', '@_filename'];
          break;

        case 'erase':
          variables = ['@_operation', '@_partition'];
          break;

        case 'getvar':
        case 'oem':
          variables = ['@_operation', '@_var'];
          break;
      }

      const commandArgs = variables
        .map((v) => step[v as keyof Step] as string)
        .join(' ');
      commandsToBeWritten.push(`fastboot ${commandArgs} || exit 1\n`);
    });

    for (const [checker, checksums] of [
      ['md5sum', md5sums],
      ['sha1sum', sha1sums],
    ]) {
      if (Object.keys(checksums).length > 0) {
        checksumString =
          checker +
          ' --check <<EOF || exit 1\n' +
          Object.entries(checksums)
            .map(([filename, checksum]) => `${checksum} *${filename}\n`)
            .join('') +
          'EOF';
      }
    }

    commandsToBeWritten.unshift(`${checksumString}\n\n`);
    commandsToBeWritten.unshift(`${info}`);

    try {
      await writeFile(output, commandsToBeWritten.join(''));
    } catch (err) {
      if (err) throw err;
    }
  } catch (err) {
    if(err) throw err;
  }
}
