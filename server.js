// Import
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import express from 'express';
import dotenv from "dotenv";
dotenv.config();

const PORT = 4000;
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import db from './config/db.js';

// 라우트
import usersRouter from './routes/users-router.js';
import postsRouter from './routes/posts-router.js';
import authRouter from './routes/auth-router.js';

// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express 앱 초기화
const app = express();

const allowedOrigins = [
    'http://3.35.209.123',    // 리버스 프록시로 인한 퍼블릭 IP
    'http://localhost:3000',  // 로컬 개발 환경
    'http://3.35.209.123:3000' // EC2 프론트엔드 환경
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

// S3 클라이언트 생성 (IAM 또는 환경 변수 사용)
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined, // IAM 역할 자동 사용 가능
});

const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;  // ✅ 환경 변수에서 CloudFront URL 가져오기

//  Presigned URL 생성 API (S3 업로드)
app.get('/presigned-url', async (req, res) => {
    const { fileName, fileType } = req.query;

    if (!fileName || !fileType) {
        return res.status(400).json({ error: "fileName과 fileType을 제공해야 합니다." });
    }

    const s3Key = `profile/${Date.now()}-${fileName}`; // 파일명을 고유하게 설정

    // AWS SDK v3 방식 (PutObjectCommand 사용)
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType,
        ACL: "public-read",
    });

    try {
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); //
        const fileUrl = `${CLOUDFRONT_URL}/${s3Key}`;
        res.json({ uploadUrl, fileUrl });
    } catch (error) {
        console.error("Presigned URL 생성 실패:", error);
        res.status(500).json({ error: "Presigned URL 생성 실패" });
    }
});

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
