import express from 'express';
import dotenv from "dotenv";
dotenv.config();
const PORT = 4000;
import cors from 'cors';
import session from 'express-session';
import db from './config/db.js';
import path from "path";
import { fileURLToPath } from "url";
// 라우트
import usersRouter from './routes/users-router.js';
import postsRouter from './routes/posts-router.js';
import authRouter from './routes/auth-router.js';
import uploadRouter from "./routes/upload-router.js";
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const allowedOrigins = [
    process.env.DOMAIN_URL,
    process.env.LOCAL_URL,
    process.env.EC2_URL,
    process.env.DOMAIN_URL
];

// CORS 설정
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
}));

// 세션 설정
app.use(
    session({
        secret: "myKey",
        resave: true,
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 60 * 60 * 1000,
        },
    })
);

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));
app.use('/img/profile', express.static(path.join(__dirname, "../img/profile")));
app.use('/img/posts', express.static(path.join(__dirname, "../img/posts")));

// 로그 미들웨어
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 설정
app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/posts", postsRouter);
app.use("/upload", uploadRouter);
// DB 연결 확인
db.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
        process.exit(1);
    });

// 서버 실행
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
