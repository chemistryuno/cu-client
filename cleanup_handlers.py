import re

with open('backend/handlers/game.go', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'// JoinRoom 加入房间[\s\S]*?^}$', '', content, flags=re.MULTILINE)
content = re.sub(r'// InitiateDuel 发起单挑[\s\S]*?^}$', '', content, flags=re.MULTILINE)
content = re.sub(r'// RespondToDuel 响应单挑[\s\S]*?^}$', '', content, flags=re.MULTILINE)

with open('backend/handlers/game.go', 'w', encoding='utf-8') as f:
    f.write(content)

with open('backend/router/api_routes.go', 'r', encoding='utf-8') as f:
    rcontent = f.read()

rcontent = re.sub(r'\s*auth\.POST\(\"/rooms/:id/join\", handlers\.JoinRoom\)', '', rcontent)
rcontent = re.sub(r'\s*auth\.POST\(\"/game/duel\", handlers\.InitiateDuel\)', '', rcontent)
rcontent = re.sub(r'\s*auth\.POST\(\"/game/duel/respond\", handlers\.RespondToDuel\)', '', rcontent)

with open('backend/router/api_routes.go', 'w', encoding='utf-8') as f:
    f.write(rcontent)

