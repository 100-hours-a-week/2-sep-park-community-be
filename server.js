// Import
import express from 'express';
const PORT = 4000;
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import multer from "multer";
// 라우트
import usersRouter from './routes/users-router.js';
import postsRouter from './routes/posts-router.js';
import authRouter from './routes/auth-router.js';

// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express 앱 초기화
const app = express();

// CORS 설정
app.use(cors({
    origin: 'http://localhost:3000', // 허용할 도메인 (프론트엔드 URL)
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'], // 허용할 HTTP 메서드
    credentials: true, // 쿠키, 인증 정보 허용
}));

//세션 설정
app.use(
    session(
        {
            secret: "myKey", // [필수] SID를 생성할 때 사용되는 비밀키로 String or Array 사용 가능.
            resave: true, // true(default): 변경 사항이 없어도 세션을 다시 저장, false: 변경시에만 다시 저장
            saveUninitialized: true, // true: 어떠한 데이터도 추가되거나 변경되지 않은 세션 설정 허용, false: 비허용
            cookie: {
                httpOnly: true,
                secure: false,
                maxAge: 60 * 60 * 1000, // 1시간
            },
        })
);

//정적 파일 제공
app.use(express.static(path.join(__dirname, 'public'))); //
app.use('/img/profile', express.static(path.join(__dirname,"../img/profile"))); // 업로드된 파일 정적 제공
app.use('/img/posts', express.static(path.join(__dirname, "../img/posts"))); //


// 로그 미들웨어
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

/// 미들웨어 설정
app.use(express.json()); // JSON 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 데이터 파싱



//--------라우터들 -----------
app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/posts", postsRouter);
//-- 서버 실행
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});