import { processNextJob } from "../lib/jobs";

async function run() {
  const job = await processNextJob();
  if (job) console.log(JSON.stringify({ id: job.id, status: job.status, type: job.type }));
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
