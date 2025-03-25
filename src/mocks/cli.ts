import { baseSanitizer } from "./baseSanitizer";

// Get command line arguments, skipping the first two (node and script path)
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error("Error: Please provide a filepath to sanitize");
  console.log("Usage: ts-node cli.ts <filepath>");
  process.exit(1);
}

const filepath = args[0];

try {
  console.log(`Sanitizing data from: ${filepath}`);
  baseSanitizer(filepath);
  console.log("Sanitization completed successfully");
} catch (error) {
  console.error("Error during sanitization:", error);
  process.exit(1);
}
