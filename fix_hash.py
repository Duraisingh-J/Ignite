import bcrypt
import re

with open('backend/app/db/seed.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Generate a valid hash
h = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode('utf-8')

# Replace the broken hash using regex
# The broken hash is $2b$12$rubne4IMJRJqQHKG3lk3OZKh1I3NgNrqMComkE8q/W62i.593bQuHMqZ1lbnC
sql = re.sub(r'\$2b\$12\$[a-zA-Z0-9./]+', h, sql)

with open('backend/app/db/seed.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
