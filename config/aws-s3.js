import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config(); // 환경변수 로드

const s3 = new S3Client({
    region: process.env.AWS_REGION || "ap-northeast-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export default s3;
