#!/usr/bin/env node

import fs from 'fs';

// Read the log file
const logFile = process.argv[2] || 'memory-benchmark-output.log';
const content = fs.readFileSync(logFile, 'utf8');

// Parse allocation and deallocation events
const allocations = new Map(); // id -> {type, size, location}
const deallocations = new Set(); // Set of deallocated IDs
const typeStats = new Map(); // type -> {allocCount, deallocCount, totalAllocSize, totalDeallocSize}

// Parse each line
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('@ALLOCATE')) {
    // Format: @ALLOCATE type size file:line id
    const match = line.match(/@ALLOCATE\s+(\S+)\s+(\d+)\s+(\S+)\s+(\d+)/);
    if (match) {
      const [, type, size, location, id] = match;
      allocations.set(id, {
        type,
        size: parseInt(size),
        location
      });
      
      // Update type stats
      if (!typeStats.has(type)) {
        typeStats.set(type, {
          allocCount: 0,
          deallocCount: 0,
          totalAllocSize: 0,
          totalDeallocSize: 0,
          leakedCount: 0,
          leakedSize: 0
        });
      }
      const stats = typeStats.get(type);
      stats.allocCount++;
      stats.totalAllocSize += parseInt(size);
    }
  } else if (line.includes('@DROP')) {
    // Format: @DROP type size id
    const match = line.match(/@DROP\s+(\S+)\s+(\d+)\s+(\d+)/);
    if (match) {
      const [, type, size, id] = match;
      deallocations.add(id);
      
      // Update type stats
      if (!typeStats.has(type)) {
        typeStats.set(type, {
          allocCount: 0,
          deallocCount: 0,
          totalAllocSize: 0,
          totalDeallocSize: 0,
          leakedCount: 0,
          leakedSize: 0
        });
      }
      const stats = typeStats.get(type);
      stats.deallocCount++;
      stats.totalDeallocSize += parseInt(size);
    }
  }
}

// Find leaked allocations
const leakedAllocations = [];
for (const [id, info] of allocations) {
  if (!deallocations.has(id)) {
    leakedAllocations.push({ id, ...info });
    
    // Update type stats for leaked memory
    const stats = typeStats.get(info.type);
    if (stats) {
      stats.leakedCount++;
      stats.leakedSize += info.size;
    }
  }
}

// Sort leaked allocations by size
leakedAllocations.sort((a, b) => b.size - a.size);

// Print analysis
console.log('=== WASM Memory Leak Analysis ===\n');

console.log(`Total allocations: ${allocations.size}`);
console.log(`Total deallocations: ${deallocations.size}`);
console.log(`Leaked allocations: ${leakedAllocations.length}\n`);

// Calculate total leaked memory
const totalLeakedMemory = leakedAllocations.reduce((sum, alloc) => sum + alloc.size, 0);
console.log(`Total leaked memory: ${(totalLeakedMemory / 1024 / 1024).toFixed(2)} MB\n`);

// Print type statistics
console.log('=== Memory Statistics by Type ===\n');
console.log('Type                     | Allocs | Deallocs | Leaked | Allocated (MB) | Deallocated (MB) | Leaked (MB)');
console.log('-------------------------|--------|----------|--------|----------------|------------------|------------');

// Sort types by leaked memory
const sortedTypes = Array.from(typeStats.entries()).sort((a, b) => b[1].leakedSize - a[1].leakedSize);

for (const [type, stats] of sortedTypes) {
  const allocMB = (stats.totalAllocSize / 1024 / 1024).toFixed(2);
  const deallocMB = (stats.totalDeallocSize / 1024 / 1024).toFixed(2);
  const leakedMB = (stats.leakedSize / 1024 / 1024).toFixed(2);
  
  console.log(
    `${type.padEnd(24)} | ${stats.allocCount.toString().padStart(6)} | ${stats.deallocCount.toString().padStart(8)} | ${stats.leakedCount.toString().padStart(6)} | ${allocMB.padStart(14)} | ${deallocMB.padStart(16)} | ${leakedMB.padStart(10)}`
  );
}

console.log('\n=== Top 10 Largest Leaked Allocations ===\n');
console.log('ID     | Type                     | Size (MB) | Location');
console.log('-------|--------------------------|-----------|-------------------------');

for (let i = 0; i < Math.min(10, leakedAllocations.length); i++) {
  const alloc = leakedAllocations[i];
  const sizeMB = (alloc.size / 1024 / 1024).toFixed(2);
  console.log(
    `${alloc.id.padEnd(6)} | ${alloc.type.padEnd(24)} | ${sizeMB.padStart(9)} | ${alloc.location}`
  );
}

// Analyze leak patterns
console.log('\n=== Leak Pattern Analysis ===\n');

// Group leaked allocations by type and location
const leakPatterns = new Map();
for (const alloc of leakedAllocations) {
  const key = `${alloc.type}:${alloc.location}`;
  if (!leakPatterns.has(key)) {
    leakPatterns.set(key, {
      type: alloc.type,
      location: alloc.location,
      count: 0,
      totalSize: 0
    });
  }
  const pattern = leakPatterns.get(key);
  pattern.count++;
  pattern.totalSize += alloc.size;
}

// Sort patterns by total leaked size
const sortedPatterns = Array.from(leakPatterns.values()).sort((a, b) => b.totalSize - a.totalSize);

console.log('Most significant leak sources:');
console.log('Type                     | Location                              | Count | Total (MB)');
console.log('-------------------------|---------------------------------------|-------|------------');

for (let i = 0; i < Math.min(10, sortedPatterns.length); i++) {
  const pattern = sortedPatterns[i];
  const totalMB = (pattern.totalSize / 1024 / 1024).toFixed(2);
  console.log(
    `${pattern.type.padEnd(24)} | ${pattern.location.padEnd(37)} | ${pattern.count.toString().padStart(5)} | ${totalMB.padStart(10)}`
  );
}

console.log('\n=== Summary ===\n');
if (leakedAllocations.length > 0) {
  console.log('⚠️  MEMORY LEAKS DETECTED');
  console.log(`   ${leakedAllocations.length} allocations were not freed`);
  console.log(`   Total leaked memory: ${(totalLeakedMemory / 1024 / 1024).toFixed(2)} MB`);
  
  // Find the most problematic type
  const worstType = sortedTypes[0];
  if (worstType && worstType[1].leakedSize > 0) {
    console.log(`   Worst offender: ${worstType[0]} (${(worstType[1].leakedSize / 1024 / 1024).toFixed(2)} MB leaked)`);
  }
} else {
  console.log('✅ No memory leaks detected');
}