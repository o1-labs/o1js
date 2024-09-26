#!/bin/bash
set +e
set -x
export OUTPUT_DIR="/tmp/perf"
export NODE_OUTPUT_DIR="${OUTPUT_DIR}/node"
export CLINIC_OUTPUT_DIR="${OUTPUT_DIR}/clinic"
export NO_INSIGHT=true
export NODE_OPTIONS="--experimental-vm-modules --perf-basic-prof --enable-source-maps --stack-trace-limit=1000 --report-dir $NODE_OUTPUT_DIR    --perf-prof-unwinding-info --perf-prof"
export NO_INSIGHT=true
export JESTOPTS=--collectCoverage
export NODEOPT1="--prof  --expose-gc"


# setup perf permissions
echo 2 > /proc/sys/kernel/perf_event_paranoid

mkdir "${OUTPUT_DIR}"
mkdir "${NODE_OUTPUT_DIR}"
mkdir "${CLINIC_OUTPUT_DIR}"
pnpm install -g clinic

cd /app/
export SOURCE_DIR=/app/src
# limit to only working tests
#TESTS="${SOURCE_DIR}/lib/provable/test/merkle-list.test.ts ${SOURCE_DIR}/lib/provable/test/merkle-tree.test.ts ${SOURCE_DIR}/lib/provable/test/scalar.test.ts  ${SOURCE_DIR}/lib/provable/test/merkle-map.test.ts  ${SOURCE_DIR}/lib/provable/test/provable.test.ts  ${SOURCE_DIR}/lib/provable/test/primitives.test.ts  ${SOURCE_DIR}/lib/provable/test/group.test.ts  ${SOURCE_DIR}/lib/provable/test/int.test.ts  ${SOURCE_DIR}/lib/mina/precondition.test.ts"
#${SOURCE_DIR}/lib/mina/token.test.ts"
# FIXME this all tests is not used because many of them fail.
ALL_TESTS=`ls -b ${SOURCE_DIR}/lib/provable/test/*.test.ts ${SOURCE_DIR}/lib/mina/*.test.ts `


run_test() {
    testname=$1
    export MULTIPLE="${testname}"
    export perfdata="${testname}.perf.data"
    OUTPUT_DIR2="${OUTPUT_DIR}$testname/"
    mkdir -p "${OUTPUT_DIR2}clinic/"
    mkdir -p "${OUTPUT_DIR2}log/"
    mkdir -p "${OUTPUT_DIR2}coverage/"

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
    
    mv ${testname}.perf.data "${OUTPUT_DIR2}/perf_data"
    mv "${testname}.*.txt" "${OUTPUT_DIR2}/perf_data"
    mv .clinic/* "${OUTPUT_DIR2}clinic/"
    mv coverage/* "${OUTPUT_DIR2}coverage/"
    mv  *.log "${OUTPUT_DIR2}log/"    
    du -s "${OUTPUT_DIR2}"
    find "${OUTPUT_DIR2}"
    ls -latr "${OUTPUT_DIR2}"
}

for testname in $TESTS;
do
    export MULTIPLE1="${testname}"
    export perfdata1="${testname}.perf.data"
    export OUTPUT_DIR3="${OUTPUT_DIR}$testname/"
    results=$(run_test $testname)
    echo $results > "${OUTPUT_DIR3}stdout.txt"
    tar -czvf "${OUTPUT_DIR}${testname}.tgz" "${OUTPUT_DIR3}"
    # remove the intermediates for space saving.
    rm -rf "${OUTPUT_DIR3}/"
    ls -latr "${OUTPUT_DIR}"
done

tar -czf /tmp/perf.data.tar.gz /tmp/perf/*



