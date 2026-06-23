import { execSync } from "child_process";
import path from "path";

export default async function globalSetup() {
  console.log("Resetting Supabase DB...");
  execSync("supabase db reset", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    timeout: 120_000,
  });
  console.log("DB reset complete.");
}
