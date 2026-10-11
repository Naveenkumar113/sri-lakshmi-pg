import psycopg2
import sys

def migrate_and_seed():
    conn = psycopg2.connect(
        host='127.0.0.1',
        port=5432,
        user='postgres',
        password='1234',
        dbname='postgres'
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    # 1. Read and execute the initial schema
    schema_path = r'f:\PG\sri-lakshmi-pg\database\migrations\001_initial_schema.sql'
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    cur.execute(schema_sql)
    print(">>> 001_initial_schema.sql executed successfully.")

    # 2. Check public tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    tables = [r[0] for r in cur.fetchall()]
    print(">>> Created tables in PostgreSQL:", tables)

    conn.close()

if __name__ == '__main__':
    migrate_and_seed()
