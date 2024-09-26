#!/usr/bin/env bash
set -e
shopt -s globstar # to expand '**' into nested directories./

#npm run build

export NODEOPT1="--prof  --expose-gc --enable-source-maps --stack-trace-limit=1000"

# find all unit tests in dist/node and run them
# TODO it would be nice to make this work on Mac
# here is a first attempt which has the problem of not failing if one of the tests fails
# find ./dist/node -name "*.unit-test.js" -print -exec node {} \;
#for f in ./dist/node/**/*.unit-test.js; do
 #   echo "Running $f"
testname=$TESTS
export MULTIPLE="${testname}"
export perfdata="${testname}.perf.data"
OUTPUT_DIR2="${OUTPUT_DIR}$testname/"
mkdir -p "${OUTPUT_DIR2}clinic/"
mkdir -p "${OUTPUT_DIR2}log/"
mkdir -p "${OUTPUT_DIR2}coverage/"

#node  $f;
clinic flame -- node $NODEOPT1 ./node_modules/.bin/../jest/bin/jest.js "${JESTOPTS}" "${MULTIPLE}" | tee "${OUTPUT_DIR2}clinic-flame.txt" 2>&1
clinic doctor -- node $NODEOPT1 ./node_modules/.bin/../jest/bin/jest.js "${JESTOPTS}" "${MULTIPLE}" | tee "${OUTPUT_DIR2}clinic-doctor.txt" 2>&1
clinic bubbleprof -- node $NODEOPT1 ./node_modules/.bin/../jest/bin/jest.js "${JESTOPTS}" "${MULTIPLE}" | tee "${OUTPUT_DIR2}clinic-bubble.txt" 2>&1
clinic heapprofiler -- node $NODEOPT1 ./node_modules/.bin/../jest/bin/jest.js "${JESTOPTS}" "${MULTIPLE}"  | tee "${OUTPUT_DIR2}clinic-heap.txt" 2>&1    
perf record -g -o "${testname}.perf.data" -F 999 --call-graph dwarf node  $NODEOPT1 ./node_modules/.bin/../jest/bin/jest.js "${JESTOPTS}" "${MULTIPLE}" > "${testname}.reportout.txt" 2>&1
perf archive ${testname}.perf.data
perf report -i "${perfdata}" --verbose --stdio --header > "${perfdata}.header.txt" 2>&1
perf report -i "${perfdata}" --verbose --stdio --stats > "${perfdata}.stats.txt" 2>&1
perf script -F +pid -i "${perfdata}"  > "${perfdata}.script.txt" 2>&1
perf report --stdio -i "${perfdata}"  > "${perfdata}.report.txt" 2>&1
ls -latr jit*.dump
rm -r jit*.dump

tar -czvf "${OUTPUT_DIR}${testname}.tgz" "${OUTPUT_DIR}/*"
ls -latr "${OUTPUT_DIR}"
#done

tar -czf /tmp/perf.data.tar.gz /tmp/perf/*
