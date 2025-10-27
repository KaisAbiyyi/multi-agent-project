# Markdown Renderer

A comprehensive markdown renderer component with full support for GitHub Flavored Markdown (GFM), syntax highlighting, math equations, and custom styling.

## Features

### ✅ Supported Markdown Elements

#### Text Formatting
- **Bold**: `**bold text**` or `__bold text__`
- *Italic*: `*italic text*` or `_italic text_`
- ~~Strikethrough~~: `~~strikethrough~~`
- `Inline Code`: `` `code` ``

#### Headings
```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

#### Lists
- Unordered lists with `-`, `*`, or `+`
- Ordered lists with numbers
- Nested lists supported
- Task lists: `- [ ]` and `- [x]`

#### Links & Images
```markdown
[Link text](https://example.com)
![Alt text](image-url.jpg)
```

#### Code Blocks
- Syntax highlighting for 180+ languages
- Language badge in top-right corner
- Line numbers support
- Copy button (can be added)

````markdown
```javascript
function hello() {
  console.log("Hello, World!");
}
```
````

#### Tables
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

#### Blockquotes
```markdown
> This is a blockquote
> It can span multiple lines
```

#### Horizontal Rules
```markdown
---
***
___
```

#### Math Equations
- Inline math: `$E = mc^2$`
- Block math:
```markdown
$$
\int_{a}^{b} f(x) dx
$$
```

#### HTML (Raw)
Raw HTML elements are supported via `rehype-raw`

## Usage

```tsx
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';

function MyComponent() {
  const markdown = `
# Hello World

This is **bold** and this is *italic*.

\`\`\`typescript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
  `;

  return <MarkdownRenderer content={markdown} />;
}
```

## Dependencies

- `react-markdown`: Core markdown rendering
- `remark-gfm`: GitHub Flavored Markdown support
- `remark-math`: Math equation support
- `rehype-highlight`: Syntax highlighting
- `rehype-raw`: Raw HTML support
- `rehype-katex`: LaTeX math rendering
- `highlight.js`: Code syntax highlighting
- `katex`: Math typesetting

## Styling

The component uses Tailwind CSS for styling and includes:
- Dark mode support via `dark:prose-invert`
- Custom code block styling with syntax highlighting
- Responsive tables with horizontal scrolling
- Custom styled blockquotes, lists, and headings
- Syntax highlighting theme: GitHub Dark

## Customization

To customize the rendering, modify the `components` object in `markdown-renderer.tsx`:

```tsx
const components: Components = {
  code({ className, children, ...props }) {
    // Custom code rendering
  },
  a({ children, href, ...props }) {
    // Custom link rendering
  },
  // ... other components
};
```

## Examples

### Code Block with Syntax Highlighting
````markdown
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```
````

### Table
```markdown
| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| Code Highlighting | ✅ |
| Math Equations | ✅ |
```

### Math Equation
```markdown
The quadratic formula is: $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$
```

### Task List
```markdown
- [x] Implement markdown renderer
- [x] Add syntax highlighting
- [x] Add math support
- [ ] Add copy button for code blocks
```
