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
authRouter.get('/presigned-url',authController. getPresigned);
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