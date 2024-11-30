// 회원가입 api에서 중복 체크를 분리하는게 좋을까

import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import path from 'path';
import { promises as fsPromises } from 'fs';

// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 경로 설정
const userPath = path.join(__dirname, "../../users.json");

// 회원가입
const postSignup =async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const profileImagePath = `/img/profile/${req.file.filename}`;
        if (!req.file) {
            return res.status(400).json({ message: "프로필 이미지가 업로드되지 않았습니다." });
        }
        if (!email || !password || !name) {
            return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
        }
        //json파일경로 읽어오기
        const rawUsers =await fsPromises.readFile(userPath, 'utf-8');
        const users = JSON.parse(rawUsers);
        if (users.some((user) => user.email === email)) {
            return res.status(409).json({ message: "이미 사용 중인 이메일입니다." });
        }
        if (users.some((user) => user.name === name)) {
            return res.status(409).json({ message: "이미 사용 중인 닉네임입니다." });
        }
        //userId생성
        const newUserId = users.length > 0 ? Math.max(...users.map((user) => user.userId)) + 1 : 1;
        const encryptedPassword = await bcrypt.hash(password, 10);

        const newUser = { userId: newUserId, email, password: encryptedPassword, name, profileImagePath };
        users.push(newUser);
        await fsPromises.writeFile(userPath, JSON.stringify(users, null, 2), "utf-8");
        res.status(201).json({ message: "회원가입이 완료되었습니다.", data: { userId: newUserId } });
    } catch (error) {
        console.error("서버 에러 발생:", error);
        res.status(500).json({ message: "서버에서 문제가 발생했습니다." });
    }
};

const postLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        let users = [];
        // 파일 존재 여부 확인
        const fileExists = await fsPromises.access(userPath).then(() => true).catch(() => false);
        // 파일 읽기
        if (fileExists) {
            const data = await fsPromises.readFile(userPath, "utf-8");
            users = data ? JSON.parse(data) : [];
        }

        const user = users.find((user) => user.email === email);
        if (!user) {
            return res.status(401).json({ message: "이메일 또는 비밀번호가 잘못되었습니다.", data: null });
        }
        // 암호 비교
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            return res.status(401).json({ message: "이메일 또는 비밀번호가 잘못되었습니다.", data: null });
        }

        req.session.user = {
            userId: user.userId,
            nickname: user.name,
            profileImg: user.profileImagePath,
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
const authController={
    postSignup,
    postLogin,
    getSession,
    getEmailCheck,
    getNameCheck
}

export default authController;