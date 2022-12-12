import { time } from 'console';
import fs from 'fs';

export { getProfiler };

function getProfiler(name: string) {
  let times: Record<string, any> = {};
  let label: string;

  return {
    get times() {
      return times;
    },
    start(label_: string) {
      label = label_;
      times = {
        ...times,
        [label]: {
          start: performance.now(),
        },
      };
    },
    stop() {
      times[label].end = performance.now();
    },
    store() {
      let profilingData = `## Times for ${name}\n\n`;
      profilingData += `| Name | time passed in s |\n|---|---|`;
      let totalTimePassed = 0;

      Object.keys(times).forEach((k) => {
        let timePassed = (times[k].end - times[k].start) / 1000;
        totalTimePassed += timePassed;

        profilingData += `\n|${k}|${timePassed}|`;
      });

      profilingData += `\n\nIn total, it took ${totalTimePassed} seconds to run the entire benchmark\n\n\n`;

      fs.appendFileSync('profiling.md', profilingData);
    },
  };
}
