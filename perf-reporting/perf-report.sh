#!/bin/bash

#set | grep .
#find "/app/perf-reporting/"
#ls -latr "/app/perf-reporting/data/"
#ls -latr "/app/perf-reporting/input_data/perf.data.zip"
#unzip "/app/perf-reporting/input_data/perf.data.zip" -d /app/perf-reporting/data/

ls -latr /app/perf-reporting/input_data/ 
find /app/perf-reporting/input_data/

pushd /app/perf-reporting/output || exit

if [ -f /app/perf-reporting/scripts/perf-report.sh ] ;
then
   bash -x /app/perf-reporting/scripts/perf-report.sh
fi

mkdir -p /app/perf-reporting/output/unzip
mkdir -p /app/perf-reporting/output/untar

for zipf in /app/perf-reporting/input_data/*.zip;
do
    echo "${zipf}"
    unzip -u "${zipf}" -d /app/perf-reporting/output/unzip
done

for tarf in /app/perf-reporting/output/unzip/*.tar.gz;
do
    echo "${tarf}"
    tar -xzf "${tarf}" -C /app/perf-reporting/output/untar/
    ls -later /app/perf-reporting/output/untar/
    find /app/perf-reporting/output/untar/
done

ls -latr /app/perf-reporting/output/untar/tmp/perf/

mkdir -p ~/.debug

mkdir -p /app/perf-reporting/output/results/

for perfdata in /app/perf-reporting/output/untar/tmp/perf/*.perf.data;
do
    echo "${perfdata}"
    ls -latr "${perfdata}"
    tar xvf "${perfdata}.tar.bz2" -C ~/.debug		
    perf report -i "${perfdata}" --verbose --stdio --header > "${perfdata}.header.txt" 2>&1
    perf report -i "${perfdata}" --verbose --stdio --stats > "${perfdata}.stats.txt" 2>&1
    perf script -F +pid -i "${perfdata}"  > "${perfdata}.script.txt" 2>&1
    perf report --stdio -i "${perfdata}"  > "${perfdata}.report.txt" 2>&1
    ls -latr "${perfdata}"
done

mv /app/perf-reporting/output/untar/tmp/perf/*.txt /app/perf-reporting/output/results/
ls -latr /app/perf-reporting/output/results/
tar -czf /app/perf-reporting/output/results.tgz  /app/perf-reporting/output/results/
