import { XMLParser } from 'fast-xml-parser';

interface Step {
  '@_operation': string;
  '@_var'?: string;
  '@_MD5'?: string;
  '@_filename'?: string;
  '@partition'?: string;
  '@_SHA1'?: string;
}

export default async function generate(input: string, output: string) {
  const text = await Bun.file(input).text();
  const parser = new XMLParser({ ignoreAttributes: false });

  let commandsToBeWritten: string[] = [];
  let checksumString: string | null = null;
  let md5sums: Record<string, string> = {};
  let sha1sums: Record<string, string> = {};

  const { flashing } = parser.parse(text);
  const steps: Step[] = flashing.steps.step;

  console.log(`Generating shellscript for ${flashing.header.software_version['@_version']}`);

  steps.forEach((step) => {
    if(step['@_MD5'] && step['@_filename']) {
      md5sums[step['@_filename']] = step['@_MD5'];
    } else if(step['@_SHA1'] && step['@_filename']) {
      sha1sums[step['@_filename']] = step['@_SHA1'];
    }
    

    const operation = step['@_operation'];
    let variables: string[] = [];

    switch(operation) {
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

    const commandArgs = variables.map(v => step[v as keyof Step] as string).join(' ');
    commandsToBeWritten.push(`fastboot ${commandArgs} || exit 1\n`);
  });

  for (const [checker, checksums] of [['md5sum', md5sums], ['sha1sum', sha1sums]]) {
    if (Object.keys(checksums).length > 0) {
      checksumString = checker + ' --check <<EOF || exit 1\n' + Object.entries(checksums).map(([filename, checksum]) => `${checksum} *${filename}\n`).join('') + 'EOF';
    }
  }

  commandsToBeWritten.unshift(`${checksumString}\n\n`);
  Bun.write(output, commandsToBeWritten);
}
