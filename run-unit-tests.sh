#!/usr/bin/env bash
set -x
shopt -s globstar # to expand '**' into nested directories./
testname=$TESTS
echo TESTS "$TESTS"
export OUTPUT_DIR="/tmp/perf"
export MULTIPLE="${testname}"
#pnpm install -g clinic
OUTPUT_DIR2="${OUTPUT_DIR}$testname/"
mkdir -p "${OUTPUT_DIR2}clinic/"
mkdir -p "${OUTPUT_DIR2}log/"
mkdir -p "${OUTPUT_DIR2}coverage/"
export perfdata="${OUTPUT_DIR2}perf.data"
node   "${MULTIPLE}"
clinic flame -- node   "${MULTIPLE}"
clinic flame -- node   "${MULTIPLE}" | tee "${OUTPUT_DIR2}clinic-flame.txt" 2>&1
cat "${OUTPUT_DIR2}clinic-flame.txt"
clinic doctor -- node   "${MULTIPLE}" | tee "${OUTPUT_DIR2}clinic-doctor.txt" 2>&1
clinic bubbleprof -- node   "${MULTIPLE}" | tee "${OUTPUT_DIR2}clinic-bubble.txt" 2>&1
clinic heapprofiler -- node   "${MULTIPLE}"  | tee "${OUTPUT_DIR2}clinic-heap.txt" 2>&1    
perf record -g -o "${testname}.perf.data" -F 999 --call-graph dwarf node    "${MULTIPLE}" > "${testname}.reportout.txt" 2>&1
perf archive "${testname}.perf.data"
perf report -i "${perfdata}" --verbose --stdio --header > "${perfdata}.header.txt" 2>&1
perf report -i "${perfdata}" --verbose --stdio --stats > "${perfdata}.stats.txt" 2>&1
perf script -F +pid -i "${perfdata}"  > "${perfdata}.script.txt" 2>&1
perf report --stdio -i "${perfdata}"  > "${perfdata}.report.txt" 2>&1
ls -latr jit*.dump
rm -r jit*.dump
#find "${OUTPUT_DIR}"
tar -czvf "${OUTPUT_DIR}${testname}.tgz" "${OUTPUT_DIR}"
#tar -vczf /tmp/perf.data.tar.gz /tmp/perf/*
#mv "${OUTPUT_DIR}${testname}.tgz" /tmp/perf.data.tar.gz
rm -rf "${OUTPUT_DIR}/"
ls -latr /tmp/perf.data.tar.gz

