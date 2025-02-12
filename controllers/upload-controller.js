import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3 from "../config/aws-s3.js";

//  Presigned URL 생성 API (폴더 선택 가능)
const getPresigned = async (req, res) => {
    const { fileName, fileType, folder } = req.query;

    if (!fileName || !fileType) {
        return res.status(400).json({ error: "fileName과 fileType을 제공해야 합니다." });
    }

    // 업로드할 폴더 동적 설정 (기본값: profile)
    const uploadFolder = folder || "profile";
    // 띄어쓰기 _로 대체
    const sanitizedFileName = fileName.replace(/\s+/g, "_");
    const s3Key = `${uploadFolder}/${Date.now()}-${sanitizedFileName}`;
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType,
    });
    console.log("Requested fileType:", fileType); // 디버깅용 로그
    try {
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
        const fileUrl = `${process.env.CLOUDFRONT_URL}/${s3Key}`;
        res.json({ uploadUrl, fileUrl });
    } catch (error) {
        console.error("Presigned URL 생성 실패:", error);
        res.status(500).json({ error: "Presigned URL 생성 실패" });
    }
};


const uploadController = { getPresigned };
export default uploadController;
