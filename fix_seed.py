import re

with open('backend/app/db/seed.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

sql = sql.replace('name, email, join_date)', 'name, email, join_date, password_hash, role)')
# Add hash and role to the values
# Match 'YYYY-MM-DD')
hash_val = "'$2b$12$rubne4IMJRJqQHKG3lk3OZKh1I3NgNrqMComkE8q/3iOFIZNkBbC2'"
role_val = "'EMPLOYEE'"

sql = re.sub(r"(\d{4}-\d{2}-\d{2}')\)", rf"\1, {hash_val}, {role_val})", sql)

with open('backend/app/db/seed.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
