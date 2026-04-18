import re

with open('backend/database/db.go', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\s*"strings"', '', content)

with open('backend/database/db.go', 'w', encoding='utf-8') as f:
    f.write(content)
