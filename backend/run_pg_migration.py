import os
import psycopg2
import sys

def migrate_and_seed():
    db_host = os.getenv("PGHOST", "127.0.0.1")
    db_ports = [int(p) for p in os.getenv("PGPORTS", "5432,5433").split(",")]
    if os.getenv("PGPORT"):
        db_ports = [int(os.getenv("PGPORT"))] + [p for p in db_ports if p != int(os.getenv("PGPORT"))]

    db_user = os.getenv("PGUSER", "postgres")
    db_password = os.getenv("PGPASSWORD", "1234")
    db_name = os.getenv("PGDATABASE", "postgres")

    for port in db_ports:
        print(f"\n--- Checking PostgreSQL on port {port} ---")
        try:
            conn = psycopg2.connect(
                host=db_host,
                port=port,
                user=db_user,
                password=db_password,
                dbname=db_name
            )
            conn.autocommit = True
            cur = conn.cursor()
        except Exception as e:
            print(f"Skipping port {port}: {e}")
            continue

        # Find migrations folder relative to this script
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        migrations_dir = os.path.join(base_dir, "database", "migrations")
        
        if not os.path.exists(migrations_dir):
            print(f"Migrations directory not found: {migrations_dir}")
            conn.close()
            continue

        migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
        for mf in migration_files:
            filepath = os.path.join(migrations_dir, mf)
            with open(filepath, "r", encoding="utf-8") as f:
                sql_script = f.read()
            cur.execute(sql_script)
            print(f">>> {mf} executed successfully on port {port}.")

        # Check public tables
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        tables = [r[0] for r in cur.fetchall()]
        print(f">>> Total tables in PostgreSQL (port {port}): {len(tables)}")
        print(tables)

        conn.close()

if __name__ == '__main__':
    migrate_and_seed()

