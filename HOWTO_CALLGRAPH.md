# How to Create an Effective Call Graph Visualization

This document explains how I created the Sparky call graph visualization, evolving from a messy tangle to a clean, readable grid of individual entry point graphs.

## Problem Evolution

### Initial Attempt: Force-Directed Graph
**Problem**: Created a force-directed graph with all nodes and connections visible at once.
- **Issue**: Nodes spread too far apart, hard to see relationships
- **User Feedback**: "the visualization is too spread apart"

### Second Attempt: Grid Layout with All Connections
**Problem**: Organized nodes into rows by type (WASM → Critical → Core → Unused)
- **Issue**: Too many crossing arrows, looked like spaghetti
- **User Feedback**: "shouldn't there be like, more than one arrow coming from nodes?"

### Final Solution: Individual Entry Point Graphs
**Success**: Each WASM entry point gets its own mini call graph in a grid layout
- **Result**: Clean, readable, no crossing arrows
- **User Feedback**: "this is fucking perfect"

## Key Design Decisions

### 1. Data Structure
```javascript
const entryPointGraphs = {
    fieldExists: {
        category: 'field',
        calls: [
            { target: 'with_run_state', type: 'core', level: 1 },
            { target: 'exists_impl', type: 'core', level: 1 },
            { target: 'alloc_var', type: 'impl', level: 2, parent: 'exists_impl' },
            { target: 'cvar_to_js', type: 'helper', level: 2, parent: 'exists_impl' }
        ]
    }
    // ... more entry points
};
```

**Key insights**:
- Each entry point is isolated with its own call graph
- `level` indicates call depth (1 = direct call, 2 = indirect, etc.)
- `parent` specifies which function makes the call (defaults to entry point)
- `type` determines node color and size

### 2. Visual Hierarchy
- **Entry Points** (Orange, larger): The WASM-exposed functions users call
- **Core Functions** (Blue): Essential system functions like `with_run_state`
- **Implementations** (Green): Actual logic implementations
- **Helper Functions** (Purple): Utility functions

### 3. Layout Algorithm
```javascript
// Position nodes by level
Object.keys(nodesByLevel).forEach(level => {
    const levelNodes = nodesByLevel[level];
    const levelY = 30 + parseInt(level) * levelHeight;
    const spacing = width / (levelNodes.length + 1);
    
    levelNodes.forEach((node, i) => {
        nodeObj.x = spacing * (i + 1);
        nodeObj.y = levelY;
    });
});
```

- Hierarchical layout: Entry point at top, dependencies flow downward
- Each level gets equal vertical spacing (60px)
- Nodes at same level distributed horizontally

### 4. Grid Container Layout
```css
#visualization {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 30px;
}
```

- Responsive grid that adapts to screen size
- Each graph gets minimum 400px width
- Consistent spacing between graphs

### 5. Arrow Design
```javascript
// Curved paths for better readability
.attr("d", d => {
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * 0.7;
    return `M${d.source.x},${d.source.y + 10}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y - 10}`;
})
```

- Used curved paths (arcs) instead of straight lines
- Arrows start/end with offset from node centers
- Each graph has its own arrow markers to avoid ID conflicts

## Technical Implementation

### 1. D3.js Setup
- Downloaded D3.js v7 locally due to CDN SSL issues
- Used D3 for SVG manipulation but NOT for force simulation
- Each mini-graph is a separate SVG element

### 2. Filtering System
```javascript
document.getElementById('show-field').addEventListener('click', function() {
    currentFilter = 'field';
    updateButtons();
    renderGraphs();
});
```

- Categories: field, gates, poseidon, run, constraint
- Completely re-renders graphs when filter changes
- Updates statistics in real-time

### 3. Hover Interactions
- Nodes: Grow and glow on hover
- Tooltips: Show function details
- No node dragging (fixed positions for clarity)

### 4. Performance Optimizations
- Each graph is independent (no global force simulation)
- Fixed node positions (no physics calculations)
- Minimal DOM updates when filtering

## Lessons Learned

### What Doesn't Work
1. **Showing everything at once**: Too complex, arrows cross everywhere
2. **Force-directed layouts**: Unpredictable, hard to read
3. **Single shared graph**: Can't see individual call paths clearly
4. **Transform scale on hover**: Causes wiggling/position changes

### What Works
1. **Separate graphs per entry point**: Clear, focused view
2. **Hierarchical layout**: Natural top-to-bottom flow
3. **Curved arrows**: Easier to follow than straight lines
4. **Fixed positions**: Predictable, scannable layout
5. **Category filtering**: Reduces cognitive load
6. **Consistent color coding**: Quick visual parsing

## How to Extend This

### Adding New Entry Points
1. Add to `entryPointGraphs` object with:
   - `category`: for filtering
   - `calls`: array of function calls with level and parent

### Adding New Categories
1. Add filter button in HTML
2. Add event listener
3. Ensure entry points have correct category

### Customizing Appearance
- Node colors: Modify `getNodeColor()` function
- Node sizes: Adjust radius values in `createEntryPointGraph()`
- Arrow styles: Modify path attributes and marker definitions
- Grid layout: Adjust `minmax()` values in CSS grid

## Why This Approach Works

1. **Cognitive Load**: Each graph shows one complete story
2. **No Ambiguity**: Every arrow has clear source and destination
3. **Scalable**: Can handle hundreds of entry points
4. **Maintainable**: Easy to add/remove entry points
5. **Readable**: Natural left-to-right, top-to-bottom flow

## Tools and Technologies

- **D3.js v7**: For SVG creation and manipulation
- **CSS Grid**: For responsive layout
- **Vanilla JavaScript**: No framework dependencies
- **HTML5/CSS3**: Modern web standards

## Final Tips

1. **Start with the data structure** - Get this right first
2. **Iterate on user feedback** - "Too spread apart" → Grid layout
3. **Embrace constraints** - Fixed positions are features, not limitations
4. **Test with real data** - Use actual function names and relationships
5. **Keep it simple** - Separate graphs > one complex graph

The key insight: **Sometimes the best visualization is many small, simple visualizations rather than one large, complex one.**