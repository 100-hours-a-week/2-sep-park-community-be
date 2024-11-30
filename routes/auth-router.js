import path from "path";
import express from "express";
import multer from "multer";
import authController from "../controllers/auth-controller.js";
import { fileURLToPath } from 'url';
// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//Router 생성
const authRouter = express.Router();
/// Multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 프로젝트 루트 기준으로 img/profile 디렉토리 설정
        const dir = path.join(__dirname, '../../2-sep-park-community-fe/img/profile');

        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // 인코딩 변환
        const sanitizedName = originalName.replace(/\s+/g, '_'); // 공백 제거 및 치환
        cb(null, sanitizedName);
    },
});
const upload = multer({ storage });
//회원가입
authRouter.post("/signup", upload.single("profileImage"), authController.postSignup);
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