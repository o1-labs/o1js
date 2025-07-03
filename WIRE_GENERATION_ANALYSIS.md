# Wire Generation Analysis: Sparky vs Snarky

## Overview

This document analyzes how Sparky and Snarky generate wire assignments for variables in gates, focusing on the critical differences that may impact VK parity.

## Snarky Wire Generation (OCaml)

### Key Components

1. **Union-Find Structure**: Snarky uses a Union-Find data structure to track variable equivalences
   - Located in `plonk_constraint_system.ml` around line 1157
   - Manages equivalence classes for variables that are equal

2. **Wire Assignment Process**:
   ```ocaml
   (* In add_row function *)
   let add_row sys (vars : V.t option array) kind coeffs =
     (* Wire the first 7 variables (permutation columns) *)
     let num_vars = min Constants.permutation_cols (Array.length vars) in
     let vars_for_perm = Array.slice vars 0 num_vars in
     Array.iteri vars_for_perm ~f:(fun col x ->
         Option.iter x ~f:(fun x -> wire sys x sys.next_row col) ) ;
   ```

3. **Wire Function**:
   ```ocaml
   let wire' sys key row (col : int) =
     ignore (union_find sys key : V.t Union_find.t) ;
     V.Table.add_multi sys.equivalence_classes ~key ~data:{ row; col }
   ```
   - Adds position (row, col) to the variable's equivalence class
   - Union-Find tracks which variables are equivalent

4. **Permutation Generation**:
   ```ocaml
   let equivalence_classes_to_hashtbl sys =
     (* Convert equivalence classes to permutation cycles *)
     let rotate_left = function [] -> [] | x :: xs -> xs @ [ x ] in
     (* Creates permutation: pos1 → pos3, pos3 → pos7, pos7 → pos1 *)
   ```

### Critical Insights:

1. **Variable to Wire Mapping**: 
   - Variables are assigned to specific column positions (0-6) based on their order in the constraint
   - The actual wire position depends on the current row number and the column index

2. **Union-Find Optimization**:
   - When two variables are proven equal (e.g., `x = y`), they are merged in Union-Find
   - This creates equivalence classes that become permutation cycles in the final circuit

3. **Permutation Cycles**:
   - Equivalence classes are converted to permutation cycles using `rotate_left`
   - This creates the wiring/permutation data that's crucial for VK generation

## Sparky Wire Generation (Rust)

### Key Components

1. **Union-Find Structure**: Sparky HAS a Union-Find implementation but it's NOT USED properly
   ```rust
   // In constraint.rs
   pub struct UnionFind<T: Clone + Eq + Hash> {
       parent: HashMap<T, T>,
       rank: HashMap<T, usize>,
   }
   ```

2. **Wire Assignment**:
   ```rust
   fn create_constraint_wires(&self, constraint: &Constraint, row: usize) -> Vec<Wire> {
       match constraint {
           Constraint::Boolean(x) => {
               if let Cvar::Var(var_id) = x {
                   let col = var_id.0;  // Uses variable ID as column!!!
                   vec![
                       Wire { row, col },      // Left wire
                       Wire { row, col },      // Right wire  
                       Wire { row, col: 2 },   // Output wire
                   ]
               }
           }
           // Similar for other constraints...
       }
   }
   ```

3. **Critical Issues**:
   - **Uses variable ID as column index** - This is WRONG!
   - Should use column positions 0-6 consistently
   - No proper tracking of variable positions in equivalence classes

4. **Missing Permutation Integration**:
   ```rust
   fn generate_permutation_cycles(&mut self) {
       // This function exists but is called AFTER constraint generation
       // It should influence wire assignment DURING constraint generation
   }
   ```

## Key Differences

### 1. **Column Assignment**
- **Snarky**: Uses sequential column indices (0, 1, 2, ...) for variables in each row
- **Sparky**: INCORRECTLY uses variable IDs as column indices

### 2. **Union-Find Usage**
- **Snarky**: Union-Find is actively used during constraint addition to merge equivalent variables
- **Sparky**: Union-Find exists but isn't properly integrated into the constraint generation flow

### 3. **Wire Position Determination**
- **Snarky**: 
  ```ocaml
  Array.iteri vars_for_perm ~f:(fun col x ->
      Option.iter x ~f:(fun x -> wire sys x sys.next_row col) )
  ```
  Variables get column positions based on their order (0, 1, 2...)

- **Sparky**:
  ```rust
  let col = var_id.0;  // WRONG: Uses variable ID as column
  ```

### 4. **Equivalence Class Tracking**
- **Snarky**: Maintains equivalence_classes table that maps variables to all their positions
- **Sparky**: Has equivalence_classes but doesn't populate it during constraint addition

## Impact on VK Parity

The incorrect wire generation in Sparky causes:

1. **Wrong Permutation Data**: Variable positions don't match Snarky's layout
2. **Missing Optimizations**: Union-Find equivalences aren't reflected in the circuit
3. **Incorrect Gate Structure**: Variables appear in wrong columns

## Required Fixes

1. **Fix Column Assignment**: Use sequential column indices (0, 1, 2...) not variable IDs
2. **Integrate Union-Find**: Call union operations during Equal constraint handling
3. **Track Equivalence Classes**: Populate equivalence_classes during wire assignment
4. **Generate Correct Permutations**: Use Union-Find representatives when creating permutation cycles

## Example Fix

```rust
fn add_constraint_with_proper_wiring(&mut self, constraint: &Constraint) {
    let row = self.constraints.len();
    
    // Extract variables from constraint
    let vars = match constraint {
        Constraint::Equal(x, y) => {
            // Union-Find merge for equal variables
            if let (Cvar::Var(id1), Cvar::Var(id2)) = (x, y) {
                self.global_union_find.union(id1, id2);
            }
            vec![Some(x), Some(y), None]
        }
        // ... other constraint types
    };
    
    // Assign to columns sequentially (0, 1, 2...)
    for (col, var) in vars.iter().enumerate() {
        if let Some(Cvar::Var(id)) = var {
            // Track position in equivalence classes
            self.equivalence_classes.entry(*id)
                .or_insert(Vec::new())
                .push(Position { row, col });
        }
    }
    
    // Create gate with proper column layout
    let wires: Vec<Wire> = (0..vars.len())
        .map(|col| Wire { row, col })
        .collect();
}
```

This analysis reveals that Sparky's wire generation is fundamentally broken compared to Snarky's, explaining the VK parity issues.