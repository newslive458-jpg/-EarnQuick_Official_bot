import pg from "pg";

const connectionString=process.env.DATABASE_URL || "postgresql://neondb_owner:npg_TRjm3wE8BIYG@ep-nameless-tree-a1e99t7d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool=new pg.Pool({
  connectionString,
  ssl:{ rejectUnauthorized:false }
});

export default pool;
