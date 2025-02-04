import path from "path";
import express from "express";
import multer from "multer";
import authController from "../controllers/auth-controller.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
//Router 생성
const authRouter = express.Router();

const s3 = new S3Client({
    region: process.env.AWS_REGION
});
//  Presigned URL 생성 API
authRouter.get('/presigned-url', async (req, res) => {
    const { fileName, fileType } = req.query;

    if (!fileName || !fileType) {
        return res.status(400).json({ error: "fileName과 fileType을 제공해야 합니다." });
    }

    const s3Key = `profile/${Date.now()}-${fileName}`;

    // AWS SDK v3에서 PutObjectCommand 사용
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType,
        ACL: "public-read",
    });

    try {
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 }); // ✅ AWS SDK v3 방식
        const fileUrl = `${process.env.CLOUDFRONT_URL}/${s3Key}`;
        res.json({ uploadUrl, fileUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Presigned URL 생성 실패" });
    }
});
//회원가입
authRouter.post("/signup", authController.postSignup);
//로그인
authRouter.post("/login",authController.postLogin);
//이메일 중복 확인(아직 분리x)
authRouter.get("/signup/emailCheck",authController.getEmailCheck);
//닉네임 중복 확인(아직 분리x)
authRouter.get("/signup/NameCheck",authController.getNameCheck);
//세션 데이터 반환 라우터
authRouter.get("/session",authController.getSession);

// ES6 방식으로 내보내기
export default authRouter;