// Import
import express from "express";
import multer from "multer";
import usersController from "../controllers/users-controller.js";
import path from "path";
import { fileURLToPath } from 'url';
// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Router 생성
const usersRouter = express.Router();

/// Multer 프로필 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 프로젝트 루트 기준으로 img/profile 디렉토리 설정
        const dir = path.join(__dirname, "../../img/profile");

        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // 인코딩 변환
        const sanitizedName = originalName.replace(/\s+/g, '_'); // 공백 제거 및 치환
        cb(null, sanitizedName);
    },
});
const upload = multer({storage});
//로그아웃
usersRouter.post("/logout",usersController.postLogout);
//회원정보 수정+(프로필 수정기능 추가)
usersRouter.put("/:userId",upload.single('profileImage'),usersController.putInfo);
//회원정보 삭제
usersRouter.delete("/:userId",usersController.deleteInfo)
//회원 비밀번호 수정
usersRouter.put("/:userId/password",usersController.putPassword);
usersRouter.get("/name/check?",usersController.getCheckName);
usersRouter.get("/test",usersController.getTest);
// ES6 방식으로 내보내기
export default usersRouter;
