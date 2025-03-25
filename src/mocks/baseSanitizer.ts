import fs from "fs";
import { RedditSanitizer } from "./reddit/redditSanitizer";
import { Sanitizer } from "./sanitizer";

const sanitaizerMap: Record<
  string,
  {
    sanitizerDataPath: string;
    sanitizer: Sanitizer<any>;
  }
> = {
  reddit: {
    sanitizerDataPath: "./src/mocks/reddit/sanitizedData",
    sanitizer: RedditSanitizer,
  },
};

export const baseSanitizer = (filePath: string) => {
  console.log("Sanitizing data from: ", filePath);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const matchingSanitizer = Object.entries(sanitaizerMap).find(([key]) =>
    filePath.includes(key)
  );
  if (!matchingSanitizer) {
    throw new Error(`No sanitizer found for ${filePath}`);
  }
  const sanitizer = matchingSanitizer[1].sanitizer;
  const sanitized = sanitizer.sanitize(raw);

  const sanitizedDataFilePath = matchingSanitizer[1].sanitizerDataPath;

  // Ensure directory exists
  if (!fs.existsSync(sanitizedDataFilePath)) {
    fs.mkdirSync(sanitizedDataFilePath, { recursive: true });
    console.log(`Created directory: ${sanitizedDataFilePath}`);
  }

  const outputFilePath = `${sanitizedDataFilePath}/${filePath
    .split("/")
    .pop()}`;
  console.log("Writing sanitized data to: ", outputFilePath);
  fs.writeFileSync(outputFilePath, JSON.stringify(sanitized, null, 2));

  console.log(`Sanitized data written to: ${outputFilePath}`);
};
