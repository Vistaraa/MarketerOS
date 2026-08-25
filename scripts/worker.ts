import { processNextJob } from "../lib/jobs";

async function run() {
  const job = await processNextJob();
  if (job) console.log(JSON.stringify({ id: job.id, status: job.status, name: job.name }));
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
