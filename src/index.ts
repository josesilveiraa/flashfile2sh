#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import generate from "./lib/generate.js";

const program = new Command();

console.log(figlet.textSync("Flashfile2Sh"));

program
  .version("0.0.1")
  .description(
    "A CLI utility for generating flash scripts from flashfile.xml files."
  )
  .option("-i, --input [input]", "input flashfile.xml file", "flashfile.xml")
  .option("-o, --output [output]", "output flash script file", "flashfile.sh")
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

const options = program.opts();

generate(options.input, options.output).then(() => {
  console.log(`Wrote flashscript to ${options.output}`);
});
