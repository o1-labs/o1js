import fs from 'fs';

export { getProfiler };

const round = (x: number) => Math.round(x * 100) / 100;

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
      return this;
    },
    store() {
      let profilingData = `## Times for ${name}\n\n`;
      profilingData += `| Name | time passed in s |\n|---|---|`;
      let totalTimePassed = 0;

      Object.keys(times).forEach((k) => {
        let timePassed = (times[k].end - times[k].start) / 1000;
        totalTimePassed += timePassed;

        profilingData += `\n|${k}|${round(timePassed)}|`;
      });

      profilingData += `\n\nIn total, it took ${round(
        totalTimePassed
      )} seconds to run the entire benchmark\n\n\n`;

      fs.appendFileSync('profiling.md', profilingData);
    },
  };
}
