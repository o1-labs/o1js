# Frequently Asked Questions

## Getting Started

- **Q: XX?** A: [YY]

## Development

- **Q: XX?** A: [YY]

## Performance

- **Q: XX?** A: [YY]

## Common Errors

- **Q: XX?** A: [YY]

## Debugging

- **Q: How do I profile o1js performance using flame graphs? ?**

  - A: Use Clinic.js to generate flame graphs for performance profiling. Install
    it and follow this workflow:

    - Setup:
      ```bash
      npm install -g clinic
      npm run build:update-bindings # Get latest bindings
      npm run build:examples # Build examples for profiling
      ```
    - Generate flame graph:
      `bash clinic flame -- node ./dist/examples/zkprogram/program.js `

    This automatically opens a browser with an interactive flame graph showing
    performance bottlenecks.

    Best practices:

    - Keep scripts focused - only profile what you need (e.g., just
      compilation + one proof)
    - Use clean builds - `run build:examples` after script changes to see
      updates
    - Target the dist folder - use transpiled JavaScript files, not TypeScript
      source
    - Minimize noise - avoid unnecessary libraries in your profiling script
    - Read bottom-up - flame graphs show call stacks from bottom (root) to top
      (leaves)

    Analysis tips:

    - Click "Show how to use this" for an interactive tour Check total time in
      the top-left corner Learn the color coding for different operation types
    - Toggle dependencies at the bottom to focus on specific areas Zoom into
      problem areas for detailed analysis

    Note that some code sections may appear as anonymous blocks - this is a
    known limitation of the current profiling setup.
