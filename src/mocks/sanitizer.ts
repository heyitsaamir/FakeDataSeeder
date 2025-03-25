import { MockMessage } from "../services/types";

export interface Sanitizer<TRaw> {
  sanitize(raw: TRaw): MockMessage[];
}
