import { execSync } from "child_process";

export default async function globalSetup() {
  console.log("Resetting Supabase DB...");
  execSync("supabase db reset", {
    cwd: "/Users/Avishka.Indula/Projects/hackathons/synapse",
    stdio: "inherit",
    timeout: 120_000,
  });
  console.log("DB reset complete.");
}
