import os
import psycopg2
import sys

def migrate_and_seed():
    db_host = os.getenv("PGHOST", "127.0.0.1")
    db_port = int(os.getenv("PGPORT", "5432"))
    db_user = os.getenv("PGUSER", "postgres")
    db_password = os.getenv("PGPASSWORD", "1234")
    db_name = os.getenv("PGDATABASE", "postgres")

    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            dbname=db_name
        )
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"Warning: Could not connect to PostgreSQL ({e}). Please ensure PostgreSQL is running.")
        return

    # Find migrations folder relative to this script
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    migrations_dir = os.path.join(base_dir, "database", "migrations")
    
    if not os.path.exists(migrations_dir):
        print(f"Migrations directory not found: {migrations_dir}")
        conn.close()
        return

    migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
    for mf in migration_files:
        filepath = os.path.join(migrations_dir, mf)
        with open(filepath, "r", encoding="utf-8") as f:
            sql_script = f.read()
        cur.execute(sql_script)
        print(f">>> {mf} executed successfully.")

    # Check public tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    tables = [r[0] for r in cur.fetchall()]
    print(">>> Current tables in PostgreSQL:", tables)

    conn.close()

if __name__ == '__main__':
    migrate_and_seed()

