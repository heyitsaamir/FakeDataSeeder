import { MockMessage } from "../types";

export interface Sanitizer<TRaw> {
  sanitize(raw: TRaw): MockMessage[];
}
