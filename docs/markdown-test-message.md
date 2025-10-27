# Markdown Feature Test

Send this message to an agent to test all markdown rendering features:

---

# Complete Markdown Test Suite

## Text Formatting

This is **bold text** and this is __also bold__.

This is *italic text* and this is _also italic_.

This is ***bold and italic*** text.

This is ~~strikethrough~~ text.

This is `inline code` text.

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

## Lists

### Unordered List
- First item
- Second item
  - Nested item 1
  - Nested item 2
- Third item

### Ordered List
1. First item
2. Second item
   1. Nested item 1
   2. Nested item 2
3. Third item

### Task List
- [x] Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Another incomplete task

---

## Code Blocks

### JavaScript
```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
```

### Python
```python
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

print(quick_sort([3, 6, 8, 10, 1, 2, 1]))
```

### TypeScript
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
```

### SQL
```sql
SELECT 
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC;
```

### Bash
```bash
#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

---

## Tables

### Simple Table
| Feature | Status | Priority |
|---------|--------|----------|
| Markdown | ✅ | High |
| Code Highlighting | ✅ | High |
| Math Equations | ✅ | Medium |
| Diagrams | ❌ | Low |

### Aligned Table
| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| Text         | More Text      | 123           |
| Foo          | Bar            | 456           |

---

## Blockquotes

> This is a simple blockquote.

> This is a multi-line blockquote.
> It spans multiple lines.
> And can contain **formatted** text.

> Nested blockquotes:
> > This is nested
> > > This is double nested

---

## Links

[OpenAI](https://openai.com)

[GitHub](https://github.com)

[Documentation](https://docs.example.com)

---

## Math Equations

### Inline Math
The Pythagorean theorem is $a^2 + b^2 = c^2$.

Einstein's famous equation is $E = mc^2$.

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$.

### Block Math
$$
\int_{a}^{b} f(x) \, dx = F(b) - F(a)
$$

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

$$
\lim_{x \to \infty} \frac{1}{x} = 0
$$

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
\begin{bmatrix}
x \\
y
\end{bmatrix}
=
\begin{bmatrix}
ax + by \\
cx + dy
\end{bmatrix}
$$

---

## Horizontal Rules

Above rule

---

Below rule

***

Another rule

___

---

## Combined Example

### API Documentation

#### Endpoint: `/api/users`

**Method:** `POST`

**Description:** Creates a new user in the system.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

**Response:**
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200  | Success     |
| 400  | Bad Request |
| 401  | Unauthorized |
| 500  | Server Error |

**Example Usage:**
```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30
  }'
```

> **Note:** Authentication token required in header.

---

## Emoji Support

:rocket: :tada: :sparkles: ✨ 🎉 🚀

---

## Complex Nested Structure

1. **First Level**
   - Nested unordered
   - Another item
     - Second level nested
     - More items
       1. Third level ordered
       2. Another ordered
   - Back to first level nested

2. **Second Level**
   > Blockquote inside list
   > Multiple lines
   
   ```javascript
   // Code inside list
   console.log("Hello from list");
   ```
   
   | Column 1 | Column 2 |
   |----------|----------|
   | A        | B        |

---

## End of Test

If all sections above render correctly, the markdown renderer is working perfectly! ✅
