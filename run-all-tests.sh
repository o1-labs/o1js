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
ls -latr /opt/introspector/test/package.json /app/package.json
md5sum /opt/introspector/test/package.json /app/package.json
cp /opt/introspector/test/package.json /app/
cp /opt/introspector/test/*.json /app/
cp /opt/introspector/test/*.yaml /app/
cp /opt/introspector/test/*.yml /app/
ls -latr /opt/introspector/test/package.json /app/package.json
md5sum /opt/introspector/test/package.json /app/package.json

## now copy in the files from mounted
#mount
#unit-tests-1  | overlay on / type overlay (rw,relatime,lowerdir=/var/lib/docker/overlay2/l/UIKBC2YXV3UYUZFYRCLH4TJ37M:/var/lib/docker/overlay2/l/7LHLJLNVB27OGHXUO7XEJ73IKX:/var/lib/docker/overlay2/l/YNWPTNT4K5HT7DOLEKYTJ6YREI:/var/lib/docker/overlay2/l/3PHXSMMFQSD23LIQ2COAJGPMYT:/var/lib/docker/overlay2/l/5EZVVUZPIKKCBIHINUVQ6GAKPJ:/var/lib/docker/overlay2/l/A7HWVJNLVJM4XFDQCZ3A445PF6:/var/lib/docker/overlay2/l/V6QGRAJZ5C6PZ2DZ75AOMYCIJC:/var/lib/docker/overlay2/l/NLOXRMXOVMKJNGFVJ3N5OMX3XL:/var/lib/docker/overlay2/l/2DYQLDCOXDJ5YKEZPT62YDVWYT:/var/lib/docker/overlay2/l/SYENOBCMM4GYKG47EKMVGTKFMW:/var/lib/docker/overlay2/l/EWQ26C3LXGQYXFA5CHQ3T2SZEM:/var/lib/docker/overlay2/l/MJBPWKMZDIZHZMCU63VOAERPQE:/var/lib/docker/overlay2/l/2MZPMWLNWBFDLRX47REXX7G62M:/var/lib/docker/overlay2/l/N2OU72N5OJFA2IFJZEG3G5L5MT:/var/lib/docker/overlay2/l/3UAOAEALKH4XSVPE5LAVYNTFIZ:/var/lib/docker/overlay2/l/35UE4N4JPSRQ3ZVYEVHWC35HVY:/var/lib/docker/overlay2/l/SEZOZ3BO3MF5XLWZFL3CY4UGJM:/var/lib/docker/overlay2/l/R2TOJKMVGSKG7OU
#find /opt/introspector
#cp -v "/opt/introspector/test/*.json" /app/

mkdir "${OUTPUT_DIR}"
mkdir "${NODE_OUTPUT_DIR}"
mkdir "${CLINIC_OUTPUT_DIR}"
pnpm install -g clinic

cd /app/
export SOURCE_DIR=/app/src

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
    node  $NODEOPT1 ./node_modules/.bin/../jest/bin/jest.js "${JESTOPTS}" "${MULTIPLE}" > "${testname}.report_plain.txt" 2>&1
    perf record -g -o "${testname}.perf.data" -F 999 --call-graph dwarf node  $NODEOPT1 ./node_modules/.bin/../jest/bin/jest.js "${JESTOPTS}" "${MULTIPLE}" > "${testname}.reportout.txt" 2>&1
    perf archive ${testname}.perf.data
    perf report -i "${perfdata}" --verbose --stdio --header > "${perfdata}.header.txt" 2>&1
    perf report -i "${perfdata}" --verbose --stdio --stats > "${perfdata}.stats.txt" 2>&1
    perf script -F +pid -i "${perfdata}"  > "${perfdata}.script.txt" 2>&1
    perf report --stdio -i "${perfdata}"  > "${perfdata}.report.txt" 2>&1
    ls -latr jit*.dump
    rm -r jit*.dump
    
    mv ${testname}.perf.data "${OUTPUT_DIR2}perf_data"
    mv "${testname}.*.txt" "${OUTPUT_DIR2}perf_data"
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



