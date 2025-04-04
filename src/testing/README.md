# @o1js/testing

This is package contains testing utils used internally in o1js to test primitives.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
  - [Property Testing](#property-testing)
  - [Equivalence Testing](#equivalence-testing)
  - [Constraint System Testing](#constraint-system-testing)
- [Examples](#examples)
- [API Reference](#api-reference)

## Overview

1. **Property Testing**: Generate random inputs to test properties of your functions
2. **Equivalence Testing**: Compare two implementations (e.g., a bigint-based one and a Field-based one) 
3. **Constraint System Testing**: Verify that your zkSNARK circuits generate the expected constraint systems

## Installation

```bash
npm install --save-dev @o1js/testing
```
> **NOTE**: o1js must be installed in the project as peer dependency.
