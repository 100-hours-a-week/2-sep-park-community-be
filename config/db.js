import mysql from 'mysql2';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

// MySQL 풀 생성
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Promise 기반 연결
const db = pool.promise();

export default db;
