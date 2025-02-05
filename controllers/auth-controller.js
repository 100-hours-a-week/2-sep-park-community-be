// 회원가입 api에서 중복 체크를 분리하는게 좋을까
import bcrypt from 'bcrypt';
import { promises as fsPromises } from 'fs';
import db from '../config/db.js'; // 데이터베이스 연결 불러오기
import dotenv from "dotenv";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import authRouter from "../routes/auth-router.js";
dotenv.config();
//const userPath = path.join(__dirname, "../models/users.json");

// 회원가입
const postSignup = async (req, res) => {
    try {
        const { email, password, name, profileImageUrl } = req.body;

        if (!email || !password || !name || !profileImageUrl) {
            return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
        }

        // 이메일 중복 확인
        const [emailRows] = await db.execute(
            "SELECT COUNT(*) AS count FROM users WHERE email = ?",
            [email]
        );

        if (emailRows[0].count > 0) {
            return res.status(400).json({ message: "이메일이 존재합니다." });
        }

        // 이름 중복 확인
        const [nameRows] = await db.execute(
            "SELECT COUNT(*) AS count FROM users WHERE name = ?",
            [name]
        );

        if (nameRows[0].count > 0) {
            return res.status(400).json({ message: "이름이 존재합니다." });
        }

        const encryptedPassword = await bcrypt.hash(password, 10);

        // 데이터베이스에 사용자 추가
        await db.execute(
            "INSERT INTO users (email, password, name, profile_image, created_at) VALUES (?, ?, ?, ?, NOW())",
            [
                email,
                encryptedPassword,
                name,
                profileImageUrl // S3에서 업로드된 URL 저장
            ]
        );

        res.status(201).json({ message: "회원가입이 완료되었습니다." });
    } catch (error) {
        console.error("서버 에러 발생:", error);
        res.status(500).json({ message: "서버에서 문제가 발생했습니다." });
    }
};
//로그인
const postLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // db에 있는 것과 비교해야하거든 ..
        // 이메일 조회
        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ message: "이메일 또는 비밀번호가 잘못되었습니다.", data: null });
        }
        // 암호 비교
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            return res.status(401).json({ message: "이메일 또는 비밀번호가 잘못되었습니다.", data: null });
        }

        req.session.user = {
            userId: user.id,
            nickname: user.name,
            profileImg: user.profile_image,
            email: user.email,
        };

        console.log("세션 정보 저장 성공:", req.session.user);
        res.status(200).json({
            message: "로그인 성공",
            user: req.session.user,
        });
    } catch (error) {
        console.error("로그인 처리 중 오류 발생:", error);
        res.status(500).json({ message: "서버 오류가 발생했습니다.", data: null });
    }
};

// 세션 정보 반환
const getSession = (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).json({ user: req.session.user });
    }
    res.status(401).json({ message: "로그인 정보가 없습니다." });
};


const getEmailCheck = async (req, res) => {
    const rawUsers=await fsPromises.readFile(userPath, "utf-8");
    const users = JSON.parse(rawUsers);

}
const getNameCheck = async (req, res) => {
    const rawUsers=await fsPromises.readFile(userPath, "utf-8");
}
const getPresigned =async (req, res) => {
    const { fileName, fileType } = req.query;
    if (!fileName || !fileType) {
        return res.status(400).json({ error: "fileName과 fileType을 제공해야 합니다." });
    }
    const s3Key = `profile/${Date.now()}-${fileName}`;
    // AWS SDK v3에서 PutObjectCommand 사용
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME, // 여기서 Env파일 백엔드에 있는데 어케암?
        Key: s3Key, // 너도 그렇고
        ContentType: fileType, // 너는 상관없고
        ACL: "public-read",
    });

    try {
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 }); // AWS SDK v3 방식
        const fileUrl = `${process.env.CLOUDFRONT_URL}/${s3Key}`;
        res.json({ uploadUrl, fileUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Presigned URL 생성 실패" });
    }
};
const authController={
    postSignup,
    postLogin,
    getSession,
    getEmailCheck,
    getNameCheck,
    getPresigned,

}

export default authController;