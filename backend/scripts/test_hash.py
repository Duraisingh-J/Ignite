import psycopg
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings
import bcrypt

sql = 'SELECT email, password_hash FROM employee LIMIT 1'
with psycopg.connect(settings.dsn()) as conn:
    with conn.cursor() as cur:
        cur.execute(sql)
        row = cur.fetchone()
        print('DB returned hash:', repr(row[1]))
        try:
            print('Checking with checkpw:')
            result = bcrypt.checkpw(b'password123', row[1].encode('utf-8'))
            print('Result:', result)
        except Exception as e:
            print('Error checking:', type(e), e)
