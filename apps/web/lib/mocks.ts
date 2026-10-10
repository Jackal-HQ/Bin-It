import { promises as fs } from "fs";
import path from "path";

export const useMocks = () => process.env.USE_MOCKS === "1";

// mocks/ lives at the repo root, two levels above apps/web.
const MOCKS_DIR = path.join(process.cwd(), "..", "..", "mocks");

export async function readMock<T>(filename: string): Promise<T> {
  const raw = await fs.readFile(path.join(MOCKS_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}
